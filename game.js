/* KHMER GAME — LERAK V2
   Local gameplay core:
   - រែកធម្មតា
   - រែកព័ទ្ធ
   - opening 2 pieces
   - 3:00 + 2s clock
   - 30s Bot fallback
   - wooden 3D-style pieces
   The rule logic below follows the existing project rule definitions.
*/
(() => {
  "use strict";

  const W = "white", B = "black";
  const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
  const MAIN_MS = 180000;
  const INCREMENT_MS = 2000;
  const BOT_WAIT_MS = 30000;

  const boardEl = document.getElementById("board");
  const turnEl = document.getElementById("turn");
  const msgEl = document.getElementById("message");
  const bc = document.getElementById("bc");
  const wc = document.getElementById("wc");

  if (!boardEl || !turnEl || !msgEl || !bc || !wc) return;

  let gameMode = "surround";
  let board = [];
  let turn = W;
  let phase = "opening";
  let selectedOpening = [];
  let selected = null;
  let gameOver = false;

  let callTrap = null;
  let pendingCall = null;
  let callArmed = false;

  let humanSide = W;
  let botEnabled = false;
  let botTimer = null;
  let clockTimer = null;
  let whiteMs = MAIN_MS;
  let blackMs = MAIN_MS;
  let lastTick = 0;
  let lastTurn = null;

  function injectStyle() {
    if (document.getElementById("lerak-v2-style")) return;
    const style = document.createElement("style");
    style.id = "lerak-v2-style";
    style.textContent = `
      .lerak-v2-wrap{max-width:720px;margin:0 auto}
      .lerak-board{
        width:min(94vw,620px)!important;
        aspect-ratio:1!important;
        margin:14px auto!important;
        display:grid!important;
        grid-template-columns:repeat(8,1fr)!important;
        border:7px solid #70451f!important;
        border-radius:18px!important;
        overflow:hidden!important;
        background:#6f451f!important;
        box-shadow:0 18px 45px #000b,inset 0 0 0 2px #d7a55a!important;
        touch-action:manipulation;
      }
      .lerak-board .cell{
        position:relative!important;
        min-width:0!important;
        border:1px solid #81582e!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        cursor:pointer!important;
      }
      .lerak-board .cell.light{
        background:
          linear-gradient(135deg,#d8a966 0%,#c28b4d 42%,#e0bd78 100%)!important;
      }
      .lerak-board .cell.dark{
        background:
          linear-gradient(135deg,#9a612d 0%,#77451f 48%,#a96f35 100%)!important;
      }
      .lerak-board .cell::before{
        content:"";position:absolute;inset:0;pointer-events:none;opacity:.2;
        background:repeating-linear-gradient(12deg,#fff0 0 8px,#fff5 9px 10px,#0000 11px 18px);
      }
      .lerak-board .cell.selected{box-shadow:inset 0 0 0 4px #4da3ff, inset 0 0 25px #4da3ff55!important}
      .lerak-board .cell.move-choice::after,
      .lerak-board .cell.opening-choice::after{
        content:"";position:absolute;width:20%;height:20%;border-radius:50%;
        background:#e8c05f;box-shadow:0 0 0 4px #0002;z-index:1;
      }
      .lerak-board .cell.capture-choice::after{
        content:"";position:absolute;inset:8%;border:4px solid #ff7169;border-radius:50%;
        z-index:1;
      }
      .lerak-board .piece{
        position:relative!important;
        width:72%!important;height:72%!important;
        border-radius:50%!important;
        z-index:3!important;
        transform:translateZ(0);
        box-shadow:
          inset 7px 7px 10px #fff6,
          inset -10px -12px 16px #0008,
          0 6px 9px #0009!important;
        border:3px solid #4d2a13!important;
        pointer-events:none!important;
      }
      .lerak-board .piece::before{
        content:"";position:absolute;inset:9%;border-radius:50%;
        background:repeating-linear-gradient(18deg,#0000 0 6px,#0003 7px 9px,#fff1 10px 12px);
        mix-blend-mode:multiply;opacity:.55;
      }
      .lerak-board .piece::after{
        content:"";position:absolute;left:15%;top:9%;width:28%;height:20%;
        border-radius:50%;background:#fff8;filter:blur(2px);
      }
      .lerak-board .piece.white{
        background:radial-gradient(circle at 30% 22%,#fff8df 0 9%,#e8c278 24%,#ad6f31 62%,#6d3819 100%)!important;
      }
      .lerak-board .piece.black{
        background:radial-gradient(circle at 30% 22%,#c28a52 0 9%,#75431f 27%,#351708 68%,#130803 100%)!important;
      }
      .lerak-board .piece.king{
        box-shadow:
          inset 7px 7px 10px #fff6,
          inset -10px -12px 16px #0008,
          0 8px 12px #000b,
          0 0 0 3px #c79b4d88!important;
      }
      .lerak-board .piece.king::marker{content:""}
      .lerak-board .piece.king{
        outline:2px solid #d7ad58;
        outline-offset:2px;
      }
      .lerak-clock-v2{
        display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin:10px 0;
      }
      .lerak-clock-v2 .clock{
        padding:10px 8px;border:1px solid var(--line);border-radius:15px;
        background:linear-gradient(180deg,#251a10,#111114);text-align:center;
      }
      .lerak-clock-v2 .clock.active{border-color:#d9b35e;box-shadow:0 0 0 2px #d9b35e33}
      .lerak-clock-v2 .clock.danger b{color:#ff6f67}
      .lerak-clock-v2 small{display:block;color:var(--muted);font-size:9px}
      .lerak-clock-v2 b{display:block;color:var(--gold2);font-size:25px;letter-spacing:1px;margin-top:3px}
      .lerak-clock-v2 .mode{font-size:9px;color:var(--muted);text-align:center;white-space:nowrap}
      .lerak-bot-status{
        margin:8px 0;padding:9px 11px;border:1px solid var(--line);border-radius:13px;
        background:#ffffff05;color:var(--muted);font-size:10px;text-align:center;
      }
      #confirmOpening,#callTrapButton{
        display:block;margin:10px auto!important;width:min(94vw,620px);padding:12px 15px;
        border:1px solid #d5aa58;border-radius:14px;background:linear-gradient(135deg,#e6bf69,#ad752d);
        color:#17110a;font-weight:800;font-size:14px;
      }
      #callTrapButton.armed{box-shadow:0 0 0 3px #d5aa5833}
      .lerak-message{min-height:48px}
      @media(max-width:430px){
        .lerak-board{border-width:5px!important;border-radius:14px!important}
        .lerak-board .piece{width:70%!important;height:70%!important;border-width:2px!important}
        .lerak-clock-v2 b{font-size:21px}
      }
    `;
    document.head.appendChild(style);
  }

  function sideName(s) { return s === W ? "ភាគីស" : "ភាគីខ្មៅ"; }
  function other(s) { return s === W ? B : W; }
  function inside(r,c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function kh(n) { return String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d]); }
  function count(s) {
    let n=0;
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]?.side===s) n++;
    return n;
  }
  function troopCount(s) {
    let n=0;
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
      const p=board[r][c];
      if(p?.side===s && !p.king) n++;
    }
    return n;
  }
  function message(text) { msgEl.textContent = text; }

  function initialBoard() {
    const a = Array.from({length:8},()=>Array(8).fill(null));
    for(let c=1;c<8;c++) a[0][c]={side:B,king:false};
    a[1][0]={side:B,king:true};
    for(let c=0;c<8;c++) a[2][c]={side:B,king:false};

    for(let c=0;c<8;c++) a[5][c]={side:W,king:false};
    a[6][7]={side:W,king:true};
    for(let c=0;c<7;c++) a[7][c]={side:W,king:false};
    return a;
  }

  function openingFrontRow(side){ return side===B ? 2 : 5; }
  function openingDirection(side){ return side===B ? 1 : -1; }
  function validOpeningPair(a,b){
    const [r1,c1]=a,[r2,c2]=b;
    return (r1===r2 && Math.abs(c1-c2)===2) ||
           (c1===c2 && Math.abs(r1-r2)===2);
  }

  function normalMoves(r,c){
    const p=board[r][c];
    if(!p) return [];
    if(gameMode==="normal" && p.king) return [];
    const out=[];
    for(const [dr,dc] of DIRS){
      let nr=r+dr,nc=c+dc;
      while(inside(nr,nc)){
        if(board[nr][nc]) break;
        out.push([nr,nc]);
        nr+=dr; nc+=dc;
      }
    }
    return out;
  }

  function captureAt(r,c,movingSide){
    const enemy=other(movingSide);
    const pairs=[];
    if(inside(r,c-1)&&inside(r,c+1)){
      const l=board[r][c-1], rr=board[r][c+1];
      if(l?.side===enemy && rr?.side===enemy) pairs.push([[r,c-1],[r,c+1]]);
    }
    if(inside(r-1,c)&&inside(r+1,c)){
      const u=board[r-1][c], d=board[r+1][c];
      if(u?.side===enemy && d?.side===enemy) pairs.push([[r-1,c],[r+1,c]]);
    }
    return pairs.length ? pairs[0] : [];
  }

  function performCapture(r,c,movingSide){
    const victims=captureAt(r,c,movingSide);
    let kingCaptured=false;
    for(const [vr,vc] of victims){
      const p=board[vr][vc];
      if(!p || p.side===movingSide) continue;
      if(p.king) kingCaptured=true;
      board[vr][vc]=null;
    }
    return {victims,kingCaptured};
  }

  function getGroup(sr,sc){
    const p=board[sr][sc];
    if(!p) return {cells:[],liberties:[],hasKing:false};
    const side=p.side, cells=[], liberties=[], seen=new Set([`${sr},${sc}`]);
    const q=[[sr,sc]];
    while(q.length){
      const [r,c]=q.shift();
      cells.push([r,c]);
      for(const [dr,dc] of DIRS){
        const nr=r+dr,nc=c+dc;
        if(!inside(nr,nc)) continue;
        const np=board[nr][nc];
        if(!np){
          const key=`${nr},${nc}`;
          if(!liberties.some(([lr,lc])=>lr===nr&&lc===nc)) liberties.push([nr,nc]);
        }else if(np.side===side){
          const key=`${nr},${nc}`;
          if(!seen.has(key)){seen.add(key);q.push([nr,nc]);}
        }
      }
    }
    return {cells,liberties,hasKing:cells.some(([r,c])=>board[r][c]?.king)};
  }

  function applySurroundAfterMove(r,c,movingSide){
    const enemy=other(movingSide), checked=new Set(), deadGroups=[];
    for(const [dr,dc] of DIRS){
      const nr=r+dr,nc=c+dc;
      if(!inside(nr,nc)) continue;
      const np=board[nr][nc];
      if(!np || np.side!==enemy) continue;
      const key=`${nr},${nc}`;
      if(checked.has(key)) continue;
      const group=getGroup(nr,nc);
      group.cells.forEach(([gr,gc])=>checked.add(`${gr},${gc}`));
      if(group.liberties.length===0) deadGroups.push(group);
    }
    let removed=0,kingCaptured=false;
    for(const group of deadGroups){
      if(group.hasKing) kingCaptured=true;
      for(const [gr,gc] of group.cells){
        if(board[gr][gc]){board[gr][gc]=null;removed++;}
      }
    }
    return {removed,kingCaptured,deadGroups};
  }

  function getCallCaptureMoves(targetR,targetC,enemySide){
    const moves=[];
    const target=board[targetR][targetC];
    if(!target || target.side===enemySide || target.king) return moves;
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p=board[r][c];
      if(!p || p.side!==enemySide) continue;
      for(const [tr,tc] of normalMoves(r,c)){
        board[tr][tc]=p; board[r][c]=null;
        const cap=captureAt(tr,tc,enemySide);
        const hitsTarget=cap.some(([vr,vc])=>vr===targetR&&vc===targetC);
        board[r][c]=p; board[tr][tc]=null;
        if(hitsTarget) moves.push({from:[r,c],to:[tr,tc]});
      }
    }
    return moves;
  }

  function detectGameEndAfterMove(movedSide){
    if(gameMode==="normal" && troopCount(other(movedSide))===0){
      gameOver=true;
      message(`${sideName(movedSide)} ឈ្នះ! កងទ័ពគូប្រកួតស្លាប់អស់។`);
      return true;
    }
    return false;
  }

  function executeMove(sr,sc,tr,tc){
    const moved=board[sr][sc];
    if(!moved) return false;

    board[tr][tc]=moved;
    board[sr][sc]=null;

    const cap=performCapture(tr,tc,moved.side);
    if(cap.kingCaptured){
      gameOver=true;
      message(`${sideName(moved.side)} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានរែក។`);
      render();
      return true;
    }
    if(detectGameEndAfterMove(moved.side)){ render(); return true; }

    const surround=gameMode==="surround"
      ? applySurroundAfterMove(tr,tc,moved.side)
      : {removed:0,kingCaptured:false};

    if(surround.kingCaptured){
      gameOver=true;
      message(`${sideName(moved.side)} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានព័ទ្ធ។`);
      render();
      return true;
    }

    if(gameMode==="normal" && troopCount(other(moved.side))===0){
      gameOver=true;
      message(`${sideName(moved.side)} ឈ្នះ!`);
      render();
      return true;
    }

    if(callArmed && !moved.king){
      pendingCall={side:moved.side,r:tr,c:tc};
      callArmed=false;
      startCallFromPending();
      return true;
    }

    pendingCall=null;
    callArmed=false;
    turn=other(turn);

    let text="ដើរធម្មតារួច។";
    if(cap.victims.length===2 && surround.removed>0) text=`រែកបាន ២ កូន និងព័ទ្ធបាន ${kh(surround.removed)} កូន។`;
    else if(cap.victims.length===2) text="រែកបាន ២ កូន។";
    else if(surround.removed>0) text=`ព័ទ្ធបាន ${kh(surround.removed)} កូន។`;
    message(`${text} វេន ${sideName(turn)}។`);
    render();
    maybeBot();
    return true;
  }

  function openingClick(r,c){
    const p=board[r][c], front=openingFrontRow(turn);
    if(!p || p.side!==turn){
      message("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន។"); return;
    }
    if(r!==front || p.king){
      message("ដំណាក់កាលដំបូង ត្រូវជ្រើសកូនទ័ពនៅជួរមុខ។"); return;
    }
    if(selectedOpening.length===0){
      selectedOpening=[[r,c]];
      message("បានជ្រើសកូនទី១។ ជ្រើសកូនទី២ដែលរំលង ១ ក្រឡា។");
      render(); return;
    }
    if(selectedOpening[0][0]===r && selectedOpening[0][1]===c){
      selectedOpening=[]; message("បានលុបការជ្រើស។"); render(); return;
    }
    const pair=[selectedOpening[0],[r,c]];
    if(!validOpeningPair(...pair)){
      message("កូនទាំង ២ ត្រូវរំលងគ្នា ១ ក្រឡា។"); return;
    }
    selectedOpening=pair;
    message("បានជ្រើសកូន ២។ ចុច «បញ្ជាក់ចេញកូន ២»។");
    render();
  }

  function confirmOpening(){
    if(selectedOpening.length!==2) return;
    const front=openingFrontRow(turn), dir=openingDirection(turn);
    for(const [r,c] of selectedOpening){
      const p=board[r][c];
      if(r!==front || !p || p.side!==turn || p.king){
        message("ការចេញដំបូងត្រូវជ្រើសកូនទ័ព ២ នៅជួរមុខ។"); return;
      }
    }
    const dest=selectedOpening.map(([r,c])=>[r+dir,c]);
    if(dest.some(([r,c])=>!inside(r,c)||board[r][c])){
      message("ក្រឡាខាងមុខមិនទំនេរ។"); return;
    }
    const pieces=selectedOpening.map(([r,c])=>board[r][c]);
    selectedOpening.forEach(([r,c])=>board[r][c]=null);
    dest.forEach(([r,c],i)=>{board[r][c]=pieces[i];board[r][c].opened=true;});
    selectedOpening=[];

    if(!board.openingDone){
      board.openingDone=true;
      turn=other(turn);
      message(`ភាគីទីមួយបានចេញកូន ២។ ឥឡូវ ${sideName(turn)} ចេញកូន ២។`);
    }else{
      phase="normal";
      turn=other(turn);
      message(`ការចេញដំបូងរួចរាល់។ ឥឡូវលេងធម្មតា — វេន ${sideName(turn)}។`);
    }
    render();
    maybeBot();
  }

  function startCallFromPending(){
    if(!pendingCall) return;
    const {r,c,side}=pendingCall;
    const p=board[r][c];
    if(!p || p.side!==side || p.king){
      pendingCall=null; turn=other(side); render(); return;
    }
    const captures=getCallCaptureMoves(r,c,other(side));
    if(!captures.length){
      pendingCall=null; turn=other(side);
      message("គ្មានចលនារែកគោលដៅនេះទេ។ គូប្រកួតបានវេនធម្មតា។");
      render(); maybeBot(); return;
    }
    callTrap={side,r,c,captureMoves:captures};
    pendingCall=null;
    turn=other(side);
    message(`🪤 ហៅរែក! ${sideName(turn)} ជ្រើសចលនាដែលអាចមករែកកូនគោលដៅ។`);
    render();
    maybeBot();
  }

  function executeCallCapture(move){
    const [fr,fc]=move.from,[tr,tc]=move.to;
    const p=board[fr][fc];
    if(!p) return;
    board[tr][tc]=p; board[fr][fc]=null;
    const cap=performCapture(tr,tc,p.side);
    callTrap=null; selected=null;
    if(cap.kingCaptured){
      gameOver=true;
      message(`${sideName(p.side)} ឈ្នះ! ស្តេចត្រូវបានរែក។`);
    }else{
      turn=other(turn);
      message(`បានឆ្លើយតបការហៅរែក។ រែកបាន ${kh(cap.victims.length)} កូន។ វេន ${sideName(turn)}។`);
    }
    render();
    maybeBot();
  }

  function clickNormal(r,c){
    if(gameOver) return;

    if(callTrap){
      const chosen=callTrap.captureMoves.find(m=>m.to[0]===r&&m.to[1]===c);
      if(chosen){executeCallCapture(chosen);return;}
      message("ត្រូវជ្រើសចលនាដែលបានបង្ហាញសម្រាប់ការហៅរែក។");
      return;
    }

    const p=board[r][c];
    if(selected){
      const [sr,sc]=selected;
      const legal=normalMoves(sr,sc).some(([a,b])=>a===r&&b===c);
      if(legal){executeMove(sr,sc,r,c);return;}
      selected=null;
    }

    if(p && p.side===turn){
      selected=[r,c];
      if(p.king && gameMode==="normal") message("ស្តេចមិនអាចដើរនៅរែកធម្មតា។");
      else message(p.king ? "បានជ្រើសស្តេច។ ជ្រើសក្រឡាដើម្បីដើរ។" : "បានជ្រើសកូនទ័ព។ ជ្រើសក្រឡាដើម្បីដើរ។");
    }else{
      message("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន។");
    }
    render();
  }

  function clickCell(r,c){
    if(gameOver) return;
    if(phase==="opening") openingClick(r,c);
    else clickNormal(r,c);
  }

  function tryCallTrap(){
    if(gameOver || phase!=="normal" || callTrap || pendingCall) return;
    callArmed=!callArmed;
    selected=null;
    message(callArmed
      ? "🪤 បានបើក «ហៅរែក»។ ឥឡូវដើរកូនទ័ពគោលដៅ។"
      : "បានបិទ «ហៅរែក»។");
    render();
  }

  function legalMoveList(side){
    const out=[];
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p=board[r][c];
      if(!p || p.side!==side) continue;
      for(const [tr,tc] of normalMoves(r,c)) out.push({from:[r,c],to:[tr,tc]});
    }
    return out;
  }

  function botOpening(){
    const front=openingFrontRow(turn), choices=[];
    for(let c=0;c<8;c++){
      if(board[front][c]?.side===turn && !board[front][c]?.king) choices.push([front,c]);
    }
    for(const a of choices){
      for(const b of choices){
        if(validOpeningPair(a,b)) return [a,b];
      }
    }
    return null;
  }

  function botTakeTurn(){
    if(!botEnabled || gameOver || turn===humanSide) return;

    if(callTrap && turn===other(callTrap.side)){
      const m=callTrap.captureMoves[Math.floor(Math.random()*callTrap.captureMoves.length)];
      setTimeout(()=>executeCallCapture(m),500);
      return;
    }

    if(phase==="opening"){
      const pair=botOpening();
      if(!pair){ message("🤖 Bot រកការចេញដំបូងមិនឃើញ។"); return; }
      selectedOpening=pair;
      render();
      setTimeout(confirmOpening,550);
      return;
    }

    const moves=legalMoveList(turn);
    if(!moves.length){
      gameOver=true;
      message(`${sideName(humanSide)} ឈ្នះ! Bot មិនមានចលនា។`);
      render(); return;
    }

    // Prefer captures / surround opportunities, otherwise random legal move.
    let best=moves.filter(m=>{
      const p=board[m.from[0]][m.from[1]];
      board[m.to[0]][m.to[1]]=p; board[m.from[0]][m.from[1]]=null;
      const cap=captureAt(m.to[0],m.to[1],turn).length;
      board[m.from[0]][m.from[1]]=p; board[m.to[0]][m.to[1]]=null;
      return cap>0;
    });
    if(!best.length) best=moves;
    const move=best[Math.floor(Math.random()*best.length)];
    setTimeout(()=>executeMove(move.from[0],move.from[1],move.to[0],move.to[1]),500);
  }

  function maybeBot(){ if(botEnabled && turn!==humanSide) setTimeout(botTakeTurn,300); }

  function startBotFallback(){
    clearTimeout(botTimer);
    botEnabled=false;
    let remaining=30;
    updateBotStatus(`🌐 រង់ចាំអ្នកលេងពិត ${kh(remaining)} វិនាទី…`);
    botTimer=setInterval(()=>{
      remaining--;
      if(remaining>0){ updateBotStatus(`🌐 រង់ចាំអ្នកលេងពិត ${kh(remaining)} វិនាទី…`); return; }
      clearInterval(botTimer);
      botEnabled=true;
      updateBotStatus("🤖 មិនមានអ្នកលេងពិត — Bot ចូលលេងជំនួស។");
      maybeBot();
    },1000);
  }

  function updateBotStatus(text){
    const el=document.getElementById("lerakBotStatus");
    if(el) el.textContent=text;
  }

  function fmt(ms){
    const s=Math.max(0,Math.ceil(ms/1000));
    return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  }

  function ensureClockUI(){
    if(document.getElementById("lerakClockV2")) return;
    const info=document.querySelector(".lerak-info");
    if(!info) return;
    const clock=document.createElement("div");
    clock.id="lerakClockV2";
    clock.className="lerak-clock-v2";
    clock.innerHTML=`
      <div id="lerakClockWhite" class="clock"><small>⚪ ភាគីស</small><b>03:00</b></div>
      <div class="mode">3:00 + 2s</div>
      <div id="lerakClockBlack" class="clock"><small>⚫ ភាគីខ្មៅ</small><b>03:00</b></div>`;
    info.after(clock);

    const status=document.createElement("div");
    status.id="lerakBotStatus";
    status.className="lerak-bot-status";
    status.textContent="🌐 កំពុងរៀបចំការប្រកួត…";
    clock.after(status);
  }

  function paintClock(){
    ensureClockUI();
    const w=document.getElementById("lerakClockWhite");
    const b=document.getElementById("lerakClockBlack");
    if(!w||!b) return;
    w.querySelector("b").textContent=fmt(whiteMs);
    b.querySelector("b").textContent=fmt(blackMs);
    w.classList.toggle("active",turn===W&&!gameOver);
    b.classList.toggle("active",turn===B&&!gameOver);
    w.classList.toggle("danger",whiteMs<=30000);
    b.classList.toggle("danger",blackMs<=30000);
  }

  function startClock(){
    clearInterval(clockTimer);
    whiteMs=MAIN_MS; blackMs=MAIN_MS; lastTick=Date.now(); lastTurn=turn;
    clockTimer=setInterval(()=>{
      if(gameOver) return;
      const now=Date.now(), dt=now-lastTick; lastTick=now;
      if(turn===W) whiteMs=Math.max(0,whiteMs-dt);
      else blackMs=Math.max(0,blackMs-dt);

      if(lastTurn!==turn){
        if(lastTurn===W) whiteMs+=INCREMENT_MS;
        if(lastTurn===B) blackMs+=INCREMENT_MS;
        lastTurn=turn;
      }

      if(whiteMs<=0 || blackMs<=0){
        gameOver=true;
        clearInterval(clockTimer);
        message(`⏱️ ${whiteMs<=0?"ភាគីខ្មៅ":"ភាគីស"} ឈ្នះដោយពេលវេលាអស់។`);
      }
      paintClock();
    },100);
    paintClock();
  }

  function reset(){
    clearTimeout(botTimer);
    clearInterval(clockTimer);
    board=initialBoard();
    turn=Math.random()<0.5?W:B;
    humanSide=turn;
    phase="opening";
    selectedOpening=[];
    selected=null;
    gameOver=false;
    callTrap=null;
    pendingCall=null;
    callArmed=false;
    botEnabled=false;

    ensureClockUI();
    message(`ដំណាក់កាលដំបូង៖ ${sideName(turn)} ជ្រើសកូន ២ ក្នុងពេលតែមួយ។`);
    render();
    startClock();
    startBotFallback();
  }

  function startGameMode(mode){
    gameMode=mode;
    const menu=document.getElementById("modeMenu");
    const game=document.getElementById("gameArea");
    if(menu) menu.style.display="none";
    if(game) game.style.display="block";
    reset();
    message(mode==="normal"
      ? "រែកធម្មតា៖ ស្តេចមិនអាចដើរ។ រែកកើតនៅក្រឡាដែលកូនទើបចូល។"
      : "រែកព័ទ្ធ៖ ក្រុមកូនជាប់គ្នា បើគ្មានប្រឡោះទំនេរ នឹងត្រូវព័ទ្ធ។");
  }

  function backToModes(){
    clearTimeout(botTimer);
    clearInterval(clockTimer);
    const menu=document.getElementById("modeMenu");
    const game=document.getElementById("gameArea");
    if(game) game.style.display="none";
    if(menu) menu.style.display="block";
    gameOver=true;
  }

  function render(){
    boardEl.innerHTML="";
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const cell=document.createElement("div");
      cell.className=`cell ${((r+c)%2===0)?"light":"dark"}`;

      if(selected?.[0]===r && selected?.[1]===c) cell.classList.add("selected");

      if(phase==="opening"){
        if(selectedOpening.some(([a,b])=>a===r&&b===c)) cell.classList.add("opening-choice");
      }else if(callTrap){
        if(callTrap.captureMoves.some(m=>m.to[0]===r&&m.to[1]===c)) cell.classList.add("capture-choice");
      }else if(selected){
        const legal=normalMoves(selected[0],selected[1]);
        if(legal.some(([a,b])=>a===r&&b===c)) cell.classList.add("move-choice");
      }

      cell.onclick=()=>clickCell(r,c);

      const p=board[r][c];
      if(p){
        const el=document.createElement("div");
        el.className=`piece ${p.side}${p.king?" king":""}`;
        if(p.king) el.setAttribute("aria-label",p.side===W?"ស្តេចស":"ស្តេចខ្មៅ");
        cell.appendChild(el);
      }
      boardEl.appendChild(cell);
    }

    document.getElementById("confirmOpening")?.remove();
    document.getElementById("callTrapButton")?.remove();

    if(phase==="opening" && selectedOpening.length===2){
      const btn=document.createElement("button");
      btn.id="confirmOpening";
      btn.textContent="បញ្ជាក់ចេញកូន ២";
      btn.onclick=confirmOpening;
      boardEl.after(btn);
    }

    if(phase==="normal" && !callTrap && !pendingCall){
      const btn=document.createElement("button");
      btn.id="callTrapButton";
      btn.className=callArmed?"armed":"";
      btn.textContent=callArmed?"🪤 ហៅរែក (បានបើក)":"🪤 ហៅរែក";
      btn.onclick=tryCallTrap;
      boardEl.after(btn);
    }

    wc.textContent=kh(count(W));
    bc.textContent=kh(count(B));

    if(gameOver) turnEl.textContent="🏁 ចប់ការប្រកួត";
    else if(callTrap) turnEl.textContent=`🪤 ហៅរែក៖ ${sideName(turn)} ត្រូវឆ្លើយតប`;
    else if(phase==="opening") turnEl.textContent=`ដំណាក់កាលដំបូង • ${sideName(turn)}`;
    else turnEl.textContent=`វេន៖ ${sideName(turn)}`;

    paintClock();
  }

  // Expose only the public UI hooks used by index/auth.
  window.startGameMode=startGameMode;
  window.backToModes=backToModes;
  window.reset=reset;
  window.tryCallTrap=tryCallTrap;

  injectStyle();

  const restart=document.getElementById("restart");
  if(restart) restart.onclick=reset;

  // Start immediately if game area already exists.
  if(document.getElementById("gameArea")?.style.display==="block") reset();
})();
