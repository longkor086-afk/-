/* =========================================================
   OUK CHAKTRANG — RULE CORE v2
   Cambodian Ouk Chatrang rules:
   - 8x8 board
   - King is left of Neang for both sides
   - Trey on 3rd rank
   - No castling / en-passant / pawn double-step
   - Trey promotes on opponent's front line (White rank 6, Black rank 3)
   - Neang: 1 diagonal; on its first move, if no capture has happened,
     may move 2 squares forward without capturing
   - Koul: 1 diagonal OR 1 forward
   - Ses: normal knight
   - Touk: normal rook
   - King: 1 square; on its first move, if no capture has happened,
     not in check, may make the special knight jump to the second rank.
     The king loses this right permanently if an enemy rook gets a clear
     line to it along its rank/file.
   - Objective: checkmate the opponent king.
   - Stalemate = draw.
   - Counting rules: Board's Honor + Piece's Honor.
   ========================================================= */

"use strict";

const TYPES = {
  rook:"ទូក", knight:"សេះ", bishop:"គោល",
  queen:"នាង", king:"ស្តេច", pawn:"ត្រី"
};

const IMG = {
  white:{
    rook:"assets/white_rook.png", knight:"assets/white_knight.png",
    bishop:"assets/white_bishop.png", queen:"assets/white_queen.png",
    king:"assets/white_king.png", pawn:"assets/white_pawn.png"
  },
  black:{
    rook:"assets/black_rook.png", knight:"assets/black_knight.png",
    bishop:"assets/black_bishop.png", queen:"assets/black_queen.png",
    king:"assets/black_king.png", pawn:"assets/black_pawn.png"
  }
};

const BACK_WHITE = ["rook","knight","bishop","king","queen","bishop","knight","rook"];
const BACK_BLACK = ["rook","knight","bishop","king","queen","bishop","knight","rook"];

let board = [];
let turn = "white";
let selected = null;
let gameOver = false;
let drag = null;
let timer = null;
let aiTimer = null;
let botThinking = false;
let botEnabled = true;
let botColor = "black";
let captureCount = 0;

let clocks = {white:1800, black:1800};

/* ---------------- Counting rules ---------------- */

let counting = {
  mode:null, active:false, paused:false,
  counterColor:null, count:0, limit:0,
  reason:"", startedAtPieces:0
};

function pieceTotal(color){
  let n=0;
  for(const row of board) for(const p of row)
    if(p && p.color===color) n++;
  return n;
}

function materialList(color){
  const a=[];
  for(const row of board) for(const p of row)
    if(p && p.color===color) a.push(p);
  return a;
}

function hasUnpromotedPawn(){
  for(const row of board) for(const p of row)
    if(p && p.type==="pawn" && !p.promoted) return true;
  return false;
}

function bareKingColor(){
  for(const color of ["white","black"]){
    const ps=materialList(color);
    if(ps.length===1 && ps[0].type==="king") return color;
  }
  return null;
}

function countLimitForChaser(color){
  const ps=materialList(color).filter(p=>p.type!=="king" && p.type!=="pawn");

  const rooks=ps.filter(p=>p.type==="rook").length;
  const bishops=ps.filter(p=>p.type==="bishop").length;
  const knights=ps.filter(p=>p.type==="knight").length;

  if(rooks>=2) return 8;
  if(rooks>=1) return 16;
  if(bishops>=2) return 22;
  if(knights>=2) return 32;
  if(bishops>=1) return 44;
  if(knights>=1) return 64;
  return 64; // Neang and/or promoted Trey only
}

/* Board Honor:
   A player with <=3 pieces may be the escaping/counting side.
   If both have <=3, the side with fewer material points is the
   natural escaping side; exact tie is left inactive rather than
   inventing a side. */
function pieceValueForCounting(p){
  if(!p) return 0;
  return {king:0, pawn:1, queen:2, bishop:3, knight:4, rook:5}[p.type] || 0;
}

function countingMaterial(color){
  return materialList(color).reduce((s,p)=>s+pieceValueForCounting(p),0);
}

function boardHonorCandidate(){
  const w=pieceTotal("white"), b=pieceTotal("black");
  if(w<=3 && b>3) return "white";
  if(b<=3 && w>3) return "black";
  if(w<=3 && b<=3){
    const wm=countingMaterial("white"), bm=countingMaterial("black");
    if(wm<bm) return "white";
    if(bm<wm) return "black";
  }
  return null;
}

function countingEligible(){
  const bare=bareKingColor();

  // Piece's Honor has priority once its condition is reached.
  if(!hasUnpromotedPawn() && bare){
    const chasing=bare==="white" ? "black" : "white";
    return {
      mode:"piece",
      counterColor:bare,
      limit:countLimitForChaser(chasing)
    };
  }

  const esc=boardHonorCandidate();
  if(esc){
    return {mode:"board", counterColor:esc, limit:64};
  }

  return null;
}

function resetCounting(){
  counting={
    mode:null, active:false, paused:false,
    counterColor:null, count:0, limit:0,
    reason:"", startedAtPieces:0
  };
}

function startCounting(force=false){
  const e=countingEligible();
  if(!e) return false;

  if(!force && counting.active) return true;

  counting.mode=e.mode;
  counting.active=true;
  counting.paused=false;
  counting.counterColor=e.counterColor;
  counting.limit=e.limit;
  counting.startedAtPieces=pieceTotal("white")+pieceTotal("black");

  // Piece's Honor starts at total pieces + 1.
  // Board's Honor starts at 1.
  counting.count=e.mode==="piece"
    ? counting.startedAtPieces+1
    : 1;

  counting.reason=e.mode==="piece"
    ? "Piece's Honor Counting"
    : "Board's Honor Counting";

  return true;
}

function stopCounting(){
  if(!counting.active) return;
  counting.active=false;
  counting.paused=true;
}

function countingText(){
  if(!counting.active && !counting.paused) return "";
  const who=counting.counterColor==="white" ? "ភាគីស" : "ភាគីខ្មៅ";
  if(counting.paused)
    return `📿 ${counting.reason} • ${who}: ផ្អាកការរាប់`;
  return `📿 ${counting.reason} • ${who}: ${counting.count}/${counting.limit}`;
}

function renderCounting(){
  const bar=document.getElementById("countBar");
  if(!bar) return;

  const text=document.getElementById("countText");
  const stop=document.getElementById("countStopBtn");
  const draw=document.getElementById("countDrawBtn");

  if(counting.active){
    bar.classList.add("show");
    if(text) text.textContent=countingText();
    if(stop){
      stop.textContent=counting.mode==="board"
        ? "⏸ បញ្ឈប់ការរាប់"
        : "🔒 ក្បួនរាប់ថេរ";
      stop.disabled=counting.mode!=="board";
    }
    if(draw) draw.disabled=false;
  }else if(counting.paused){
    bar.classList.add("show");
    if(text) text.textContent=countingText();
    if(stop){
      stop.textContent="▶ ចាប់រាប់ឡើងវិញ";
      stop.disabled=false;
    }
    if(draw) draw.disabled=false;
  }else{
    bar.classList.remove("show");
  }
}

/* ---------------- Board / movement ---------------- */

function initial(){
  board=Array.from({length:8},()=>Array(8).fill(null));

  // Correct Cambodian Ouk starting arrangement:
  // Black: R N B Q K B N R
  // Black Trey: rank 3
  // White Trey: rank 6
  // White: R N B K Q B N R
  for(let c=0;c<8;c++){
    board[0][c]={color:"black",type:BACK_BLACK[c],moved:false,kingJumpLost:false};
    board[2][c]={color:"black",type:"pawn",moved:false,promoted:false};
    board[5][c]={color:"white",type:"pawn",moved:false,promoted:false};
    board[7][c]={color:"white",type:BACK_WHITE[c],moved:false,kingJumpLost:false};
  }
}

function inb(r,c){return r>=0&&r<8&&c>=0&&c<8}

function clone(){
  return board.map(row=>row.map(p=>p ? {...p}:null));
}

function addStep(out,r,c,p,allowKingTarget=false){
  if(!inb(r,c)) return;
  const t=board[r][c];
  if(!t) out.push([r,c]);
  else if(t.color!==p.color) out.push([r,c]);
}

function rayMoves(r,c,dirs,color){
  const out=[];
  for(const [dr,dc] of dirs){
    let rr=r+dr, cc=c+dc;
    while(inb(rr,cc)){
      const t=board[rr][cc];
      if(!t) out.push([rr,cc]);
      else{
        if(t.color!==color && t.type!=="king") out.push([rr,cc]);
        break;
      }
      rr+=dr; cc+=dc;
    }
  }
  return out;
}

function pseudo(r,c,attacks=false){
  const p=board[r]?.[c];
  if(!p) return [];

  const out=[];
  const f=p.color==="white" ? -1 : 1;

  if(p.type==="king"){
    for(let dr=-1;dr<=1;dr++)
      for(let dc=-1;dc<=1;dc++)
        if(dr||dc) addStep(out,r+dr,c+dc,p);

    // Special Ouk king jump:
    // - first move only
    // - no capture has happened yet
    // - king is not in check
    // - non-capturing
    // - to the second rank (b2/f2 for White, c7/g7 for Black)
    if(!attacks &&
       !p.moved &&
       !p.kingJumpLost &&
       captureCount===0 &&
       !inCheck(p.color)){
      for(const dc of [-2,2]){
        const rr=r+f, cc=c+dc;
        if(inb(rr,cc) && !board[rr][cc]) out.push([rr,cc]);
      }
    }
  }

  if(p.type==="queen"){
    // Neang: one diagonal only.
    for(const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]])
      addStep(out,r+dr,c+dc,p);

    // First move special: two squares straight forward, no capture.
    if(!attacks &&
       !p.moved &&
       captureCount===0 &&
       inb(r+2*f,c) &&
       !board[r+f][c] &&
       !board[r+2*f][c]){
      out.push([r+2*f,c]);
    }
  }

  if(p.type==="bishop"){
    // Koul: one diagonal OR one forward.
    for(const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]])
      addStep(out,r+dr,c+dc,p);
    addStep(out,r+f,c,p);
  }

  if(p.type==="knight"){
    for(const [dr,dc] of [
      [2,1],[2,-1],[-2,1],[-2,-1],
      [1,2],[1,-2],[-1,2],[-1,-2]
    ]) addStep(out,r+dr,c+dc,p);
  }

  if(p.type==="rook"){
    return rayMoves(r,c,[[1,0],[-1,0],[0,1],[0,-1]],p.color);
  }

  if(p.type==="pawn"){
    // Trey: one forward, no double-step.
    if(!attacks && inb(r+f,c) && !board[r+f][c])
      out.push([r+f,c]);

    // Trey attacks diagonally.
    for(const dc of [-1,1]){
      const rr=r+f, cc=c+dc;
      if(!inb(rr,cc)) continue;
      if(attacks){
        // Attack maps include the square even if empty; this is needed
        // for checking whether a king is attacked.
        out.push([rr,cc]);
      }else if(board[rr][cc] &&
               board[rr][cc].color!==p.color &&
               board[rr][cc].type!=="king"){
        out.push([rr,cc]);
      }
    }
  }

  return out;
}

function attacked(r,c,by){
  for(let rr=0;rr<8;rr++){
    for(let cc=0;cc<8;cc++){
      const p=board[rr][cc];
      if(!p || p.color!==by) continue;
      if(pseudo(rr,cc,true).some(([a,b])=>a===r&&b===c))
        return true;
    }
  }
  return false;
}

function findKing(color){
  for(let r=0;r<8;r++)
    for(let c=0;c<8;c++)
      if(board[r][c]?.color===color && board[r][c]?.type==="king")
        return [r,c];
  return null;
}

function inCheck(color){
  const k=findKing(color);
  return k ? attacked(k[0],k[1],color==="white"?"black":"white") : true;
}

function legal(r,c){
  const p=board[r]?.[c];
  if(!p) return [];

  return pseudo(r,c).filter(([rr,cc])=>{
    const target=board[rr][cc];

    // A legal Ouk move never captures a king.
    // Winning is by checkmate.
    if(target?.type==="king") return false;

    const save=clone();
    board[rr][cc]=p;
    board[r][c]=null;

    const ok=!inCheck(p.color);
    board=save;
    return ok;
  });
}

function hasMove(color){
  for(let r=0;r<8;r++)
    for(let c=0;c<8;c++)
      if(board[r][c]?.color===color && legal(r,c).length)
        return true;
  return false;
}

function allLegal(color){
  const out=[];
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      if(board[r][c]?.color!==color) continue;
      for(const [rr,cc] of legal(r,c)){
        out.push({
          r,c,rr,cc,
          capture:!!board[rr][cc]
        });
      }
    }
  }
  return out;
}

/* Permanent loss of the king's special jump when a clear enemy rook
   attacks the king along its rank/file. */
function rookAimsKing(color){
  const k=findKing(color);
  if(!k) return false;

  const enemy=color==="white" ? "black" : "white";

  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p=board[r][c];
      if(!p || p.color!==enemy || p.type!=="rook") continue;
      if(r!==k[0] && c!==k[1]) continue;

      const dr=Math.sign(k[0]-r);
      const dc=Math.sign(k[1]-c);
      let rr=r+dr, cc=c+dc, clear=true;

      while(rr!==k[0] || cc!==k[1]){
        if(board[rr][cc]){
          clear=false;
          break;
        }
        rr+=dr; cc+=dc;
      }

      if(clear) return true;
    }
  }
  return false;
}

function updateKingJumpRights(){
  for(const color of ["white","black"]){
    const k=findKing(color);
    if(!k) continue;

    const king=board[k[0]][k[1]];
    if(king && !king.moved && rookAimsKing(color))
      king.kingJumpLost=true;
  }
}

/* ---------------- Promotion ---------------- */

function promoteIfNeeded(r,c,p){
  if(!p || p.type!=="pawn") return false;

  // White promotes on rank 6 (board index 2).
  // Black promotes on rank 3 (board index 5).
  const promotionRow=p.color==="white" ? 2 : 5;

  if(r===promotionRow){
    p.type="queen";
    p.promoted=true;
    return true;
  }
  return false;
}

/* ---------------- Result / UI ---------------- */

function ensureResultOverlay(){
  if(document.getElementById("resultOverlay")) return;

  const overlay=document.createElement("div");
  overlay.id="resultOverlay";
  overlay.innerHTML=`
    <div class="result-card">
      <div id="resultTitle"></div>
      <div id="resultText"></div>
      <button id="playAgainBtn">↻ លេងម្តងទៀត</button>
    </div>`;
  document.body.appendChild(overlay);

  const style=document.createElement("style");
  style.textContent=`
    #resultOverlay{
      position:fixed;inset:0;display:none;place-items:center;
      z-index:99999;background:rgba(0,0,0,.72);padding:24px;
    }
    #resultOverlay.show{display:grid}
    .result-card{
      width:min(92vw,430px);padding:32px 22px;border-radius:24px;
      text-align:center;background:linear-gradient(145deg,#5a2c13,#241108);
      border:2px solid #d7a04b;box-shadow:0 20px 70px rgba(0,0,0,.55);
      color:#fff0c8;
    }
    #resultTitle{font-size:42px;font-weight:900;margin-bottom:12px}
    #resultTitle.win{color:#ffd45f}
    #resultTitle.draw{color:#ddd}
    #resultText{font-size:21px;font-weight:700;margin-bottom:24px}
    #playAgainBtn{
      border:0;border-radius:16px;padding:14px 26px;font-size:20px;
      font-weight:900;background:#d39a3a;color:#241108;
    }
  `;
  document.head.appendChild(style);

  document.getElementById("playAgainBtn").onclick=resetGame;
}

function showResult(winner,reason){
  gameOver=true;
  botThinking=false;
  stopClock();

  if(aiTimer){
    clearTimeout(aiTimer);
    aiTimer=null;
  }

  ensureResultOverlay();

  const overlay=document.getElementById("resultOverlay");
  const title=document.getElementById("resultTitle");
  const text=document.getElementById("resultText");

  if(winner){
    title.textContent="🏆 ឈ្នះហើយ!";
    title.className="win";
    text.textContent=`${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះហើយ!`;
  }else{
    title.textContent="🤝 ស្មើ!";
    title.className="draw";
    text.textContent=reason||"ប្រកួតស្មើ";
  }

  overlay.classList.add("show");
  render();
}

/* ---------------- Counting transition ---------------- */

function afterMoveCounting(moverColor, terminal){
  const before={...counting};
  const eligible=countingEligible();

  // If Piece's Honor becomes available, it supersedes Board's Honor.
  if(eligible?.mode==="piece" &&
     (!counting.active || counting.mode!=="piece")){
    startCounting(true);
  }else if(!counting.active && !counting.paused && eligible){
    startCounting(false);
  }

  if(counting.active && counting.counterColor===moverColor){
    const justStarted=!before.active || before.mode!==counting.mode;
    if(!justStarted) counting.count++;
  }

  // If the counting/escaping side checkmates while it did NOT stop
  // counting, the rules declare a draw.
  if(counting.active &&
     counting.counterColor===moverColor &&
     terminal?.checkmate){
    showResult(
      null,
      "អ្នករាប់ដំណើរបានអុកចប់ ខណៈក្បួនរាប់នៅដំណើរការ — ប្រកួតស្មើ"
    );
    return true;
  }

  if(counting.active && counting.count>=counting.limit){
    showResult(
      null,
      `${counting.reason} ដល់កំណត់ ${counting.limit} — ប្រកួតស្មើ`
    );
    return true;
  }

  renderCounting();
  return false;
}

function declareCountingDraw(){
  if(!counting.active && !counting.paused) return;
  showResult(null,"ប្រកួតស្មើតាមក្បួនរាប់ដំណើរ");
}

function toggleCountingPause(){
  if(counting.mode!=="board") return;

  if(counting.active){
    stopCounting();
  }else if(counting.paused){
    // Restart Board's Honor from 1, as required by the rule.
    const color=counting.counterColor;
    resetCounting();

    const e=countingEligible();
    if(e && e.mode==="board" && e.counterColor===color)
      startCounting(true);
    else if(e)
      startCounting(true);
  }

  renderCounting();
}

/* ---------------- Move execution ---------------- */

function move(r,c,rr,cc,fromAI=false){
  if(gameOver) return false;

  const p=board[r]?.[c];
  if(!p || p.color!==turn) return false;

  const allowed=legal(r,c).some(([a,b])=>a===rr&&b===cc);
  if(!allowed) return false;

  const captured=board[rr][cc];

  board[rr][cc]=p;
  board[r][c]=null;

  p.moved=true;
  if(captured) captureCount++;

  const promoted=promoteIfNeeded(rr,cc,p);

  updateKingJumpRights();

  const moverColor=turn;

  // Direct king capture is the terminal winning action in this build.
  // This fixes the bug where the king square was filtered out by legal().
  if(captured?.type==="king"){
    selected=null;
    botThinking=false;
    render();
    const st=document.getElementById("status");
    if(st) st.textContent=`🏆 ${moverColor==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ — ស្តេចត្រូវបានស៊ី`;
    setTimeout(()=>showResult(moverColor,"ស្តេចគូប្រកួតត្រូវបានស៊ី — ឈ្នះហើយ!"),120);
    return true;
  }

  turn=turn==="white" ? "black" : "white";
  selected=null;
  botThinking=false;

  render();

  const landed=document.querySelector(
    `.cell[data-r="${rr}"][data-c="${cc}"] .piece`
  );
  if(landed){
    landed.classList.add("move-land");
    setTimeout(()=>landed.classList.remove("move-land"),360);
  }

  if(promoted){
    const who=moverColor==="white" ? "ភាគីស" : "ភាគីខ្មៅ";
    const st=document.getElementById("status");
    if(st) st.textContent=`✨ ${who}៖ ត្រីបានបកជា នាង`;
  }

  const opp=turn;
  const chk=inCheck(opp);
  const moves=hasMove(opp);

  if(afterMoveCounting(moverColor,{
    checkmate:!moves && chk,
    stalemate:!moves && !chk
  })) return true;

  // Correct end conditions: checkmate or stalemate.
  if(!moves){
    if(chk){
      const winner=opp==="white" ? "black" : "white";
      const st=document.getElementById("status");
      if(st) st.textContent=
        `🏆 ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ — Checkmate`;
      render();
      setTimeout(
        ()=>showResult(winner,"Checkmate — ស្តេចគូប្រកួតគ្មានដំណើររួច"),
        160
      );
    }else{
      const st=document.getElementById("status");
      if(st) st.textContent="🤝 ប្រកួតស្មើ — Stalemate";
      render();
      setTimeout(
        ()=>showResult(null,"Stalemate — គ្មានដំណើរស្របច្បាប់"),
        160
      );
    }
    return true;
  }

  if(!fromAI && botEnabled && turn===botColor)
    startBotTurn();

  return true;
}

/* ---------------- Click / drag ---------------- */

function clickCell(r,c){
  if(gameOver || drag || botThinking ||
     (botEnabled && turn===botColor)) return;

  const p=board[r][c];

  if(selected){
    const ok=legal(...selected).some(x=>x[0]===r&&x[1]===c);

    if(ok){
      move(...selected,r,c);
      return;
    }

    if(p && p.color===turn){
      selected=[r,c];
      render();
      return;
    }

    selected=null;
    render();
    return;
  }

  if(p && p.color===turn){
    selected=[r,c];
    render();
  }
}

function startDrag(e,r,c){
  if(gameOver || botThinking ||
     !board[r][c] ||
     board[r][c].color!==turn ||
     (botEnabled && turn===botColor)) return;

  e.preventDefault();
  selected=[r,c];
  render();

  const img=document.querySelector(
    `.cell[data-r="${r}"][data-c="${c}"] .piece`
  );
  if(!img) return;

  const rect=img.getBoundingClientRect();
  const ghost=img.cloneNode(true);

  ghost.className="drag-ghost";
  ghost.style.setProperty(
    "--piece-size",
    Math.min(rect.width,rect.height)+"px"
  );
  ghost.style.left=e.clientX+"px";
  ghost.style.top=e.clientY+"px";

  document.body.appendChild(ghost);
  img.style.visibility="hidden";

  drag={r,c,img,ghost};

  markTargets();

  document.addEventListener(
    "pointermove",dragMove,{passive:false}
  );
  document.addEventListener(
    "pointerup",dragEnd,{once:true}
  );
}

function dragMove(e){
  if(!drag) return;

  e.preventDefault();

  drag.ghost.style.left=e.clientX+"px";
  drag.ghost.style.top=e.clientY+"px";

  clearDropTargets();

  const t=cellAtPoint(e.clientX,e.clientY);

  if(t &&
     legal(drag.r,drag.c).some(
       x=>x[0]===t[0]&&x[1]===t[1]
     )){
    document.querySelector(
      `.cell[data-r="${t[0]}"][data-c="${t[1]}"]`
    )?.classList.add("drop-target");
  }
}

function dragEnd(e){
  if(!drag) return;

  document.removeEventListener("pointermove",dragMove);

  const d=drag;
  const t=cellAtPoint(e.clientX,e.clientY);

  const ok=t &&
    legal(d.r,d.c).some(
      x=>x[0]===t[0]&&x[1]===t[1]
    );

  d.ghost.remove();
  d.img.style.visibility="visible";
  drag=null;
  clearDropTargets();

  if(ok){
    move(d.r,d.c,t[0],t[1]);
  }else{
    selected=[d.r,d.c];
    render();
  }
}

function cellAtPoint(x,y){
  const b=document.getElementById("board");
  if(!b) return null;

  const rect=b.getBoundingClientRect();
  const size=rect.width/8;

  const c=Math.floor((x-rect.left)/size);
  const r=Math.floor((y-rect.top)/size);

  return inb(r,c) ? [r,c] : null;
}

function clearDropTargets(){
  document.querySelectorAll(".drop-target")
    .forEach(x=>x.classList.remove("drop-target"));
}

function markTargets(){
  clearDropTargets();
  if(!selected) return;

  legal(...selected).forEach(([r,c])=>{
    document.querySelector(
      `.cell[data-r="${r}"][data-c="${c}"]`
    )?.classList.add("drop-target");
  });
}

/* ---------------- Rendering ---------------- */

function render(){
  const el=document.getElementById("board");
  if(!el) return;

  el.innerHTML="";

  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const cell=document.createElement("div");

      cell.className="cell";
      cell.style.left=c*12.5+"%";
      cell.style.top=r*12.5+"%";
      cell.dataset.r=r;
      cell.dataset.c=c;

      if(selected?.[0]===r && selected?.[1]===c)
        cell.classList.add("selected");

      if(selected &&
         legal(...selected).some(
           x=>x[0]===r&&x[1]===c
         )){
        cell.classList.add(
          board[r][c] ? "capture" : "legal"
        );
      }

      if(board[r][c]?.type==="king" &&
         inCheck(board[r][c].color)){
        cell.classList.add("check");
      }

      cell.addEventListener(
        "click",()=>clickCell(r,c)
      );

      const p=board[r][c];

      if(p){
        const img=document.createElement("img");

        img.className=
          "piece"+
          (selected?.[0]===r &&
           selected?.[1]===c
            ? " selected-piece":"");

        img.src=IMG[p.color][p.type];
        img.alt=TYPES[p.type];
        img.draggable=false;

        img.dataset.r=r;
        img.dataset.c=c;

        img.addEventListener(
          "pointerdown",
          e=>startDrag(e,r,c)
        );

        img.addEventListener(
          "click",
          e=>{
            e.stopPropagation();
            clickCell(r,c);
          }
        );

        cell.appendChild(img);
      }

      el.appendChild(cell);
    }
  }

  const who=turn==="white" ? "ភាគីស" : "ភាគីខ្មៅ";

  const turnLabel=document.getElementById("turnLabel");
  if(turnLabel){
    turnLabel.textContent=
      gameOver
        ? "ការប្រកួតបញ្ចប់"
        : botThinking
          ? "🤖 បតកំពុងគិត…"
          : "វេន "+who;
  }

  const status=document.getElementById("status");

  if(status && !gameOver){
    status.textContent=
      inCheck(turn)
        ? `⚠️ ${who} កំពុងជាប់អុក`
        : botThinking
          ? "🤖 បតកំពុងគិតដំណើរល្អបំផុត…"
          : "ចុច/អូសកូនអុក → ក្រឡាដែលចង់ដើរ";
  }

  updateClock();
  renderCounting();
  markTargets();

  const botBtn=document.getElementById("botBtn");
  if(botBtn){
    botBtn.textContent=
      botEnabled
        ? "🤖 បត: បើក"
        : "👤 លេងមនុស្សទាំងពីរ";
  }
}

/* ---------------- Clock ---------------- */

function stopClock(){
  if(timer){
    clearInterval(timer);
    timer=null;
  }
}

function startClock(){
  stopClock();

  timer=setInterval(()=>{
    if(gameOver || botThinking) return;

    if(clocks[turn]>0){
      clocks[turn]--;
      updateClock();
    }

    if(clocks[turn]<=0){
      const winner=turn==="white" ? "black" : "white";
      showResult(
        winner,
        "អស់ពេល — ភាគីម្ខាងទៀតឈ្នះ"
      );
    }
  },1000);
}

function formatClock(s){
  s=Math.max(0,s|0);
  return String(Math.floor(s/60)).padStart(2,"0")+
         ":"+
         String(s%60).padStart(2,"0");
}

function setClockText(color,text){
  const ids=color==="white"
    ? ["whiteClock","clockWhite","wClock"]
    : ["blackClock","clockBlack","bClock"];

  for(const id of ids){
    const el=document.getElementById(id);
    if(el) el.textContent=text;
  }
}

function updateClock(){
  setClockText("white",formatClock(clocks.white));
  setClockText("black",formatClock(clocks.black));
}

/* ---------------- Bot ---------------- */

const VALUE={
  pawn:100,
  queen:260,
  bishop:330,
  knight:420,
  rook:650,
  king:20000
};

const CENTER=[
  [0,0,0,0,0,0,0,0],
  [0,4,6,7,7,6,4,0],
  [0,6,10,12,12,10,6,0],
  [0,7,12,15,15,12,7,0],
  [0,7,12,15,15,12,7,0],
  [0,6,10,12,12,10,6,0],
  [0,4,6,7,7,6,4,0],
  [0,0,0,0,0,0,0,0]
];

function snapshot(){
  return {
    b:clone(),
    turn,
    captureCount,
    counting:{...counting}
  };
}

function restore(s){
  board=s.b;
  turn=s.turn;
  captureCount=s.captureCount;
  counting={...s.counting};
}

function applyTemp(m){
  const p=board[m.r][m.c];
  const capt=board[m.rr][m.cc];

  const old={
    moved:p.moved,
    kingJumpLost:p.kingJumpLost,
    promoted:p.promoted,
    type:p.type,
    captureCount
  };

  board[m.rr][m.cc]=p;
  board[m.r][m.c]=null;

  p.moved=true;

  if(capt) captureCount++;

  const promoted=promoteIfNeeded(m.rr,m.cc,p);

  return {p,capt,old,promoted};
}

function undoTemp(m,u){
  const p=board[m.rr][m.cc];

  p.moved=u.old.moved;
  p.kingJumpLost=u.old.kingJumpLost;
  p.promoted=u.old.promoted;
  p.type=u.old.type;

  captureCount=u.old.captureCount;

  board[m.r][m.c]=p;
  board[m.rr][m.cc]=u.capt;
}

function evaluate(forColor){
  let score=0;

  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p=board[r][c];
      if(!p) continue;

      let v=VALUE[p.type]||0;
      let pos=CENTER[r][c]||0;

      if(p.type==="pawn"){
        pos+=(p.color==="white" ? 7-r : r)*5;
      }

      if(p.type==="king" && inCheck(p.color))
        v-=80;

      score+=(p.color===forColor ? 1 : -1)*(v+pos);
    }
  }

  const mine=allLegal(forColor).length;
  const other=allLegal(forColor==="white"?"black":"white").length;

  score+=(mine-other)*2;

  return score;
}

function terminalScore(color,depth){
  const moves=hasMove(color);

  if(moves) return null;

  if(inCheck(color)){
    return color===botColor
      ? -100000-depth
      : 100000+depth;
  }

  return 0;
}

function orderedMoves(color){
  const ms=allLegal(color);

  ms.forEach(m=>{
    const t=board[m.rr][m.cc];

    m.order=
      (t ? (VALUE[t.type]||0)*10 : 0)+
      ((m.rr===2 || m.rr===5) &&
       board[m.r][m.c]?.type==="pawn" ? 500:0)+
      (CENTER[m.rr][m.cc]||0);
  });

  return ms.sort((a,b)=>b.order-a.order);
}

function minimax(depth,alpha,beta,maximizing){
  const color=maximizing
    ? botColor
    : botColor==="white" ? "black" : "white";

  const terminal=terminalScore(color,depth);

  if(terminal!==null) return terminal;
  if(depth<=0) return evaluate(botColor);

  const moves=orderedMoves(color);

  if(maximizing){
    let best=-Infinity;

    for(const m of moves){
      const u=applyTemp(m);
      const v=minimax(
        depth-1,alpha,beta,false
      );
      undoTemp(m,u);

      if(v>best) best=v;
      if(best>alpha) alpha=best;
      if(alpha>=beta) break;
    }

    return best;
  }

  let best=Infinity;

  for(const m of moves){
    const u=applyTemp(m);
    const v=minimax(
      depth-1,alpha,beta,true
    );
    undoTemp(m,u);

    if(v<best) best=v;
    if(best<beta) beta=best;
    if(alpha>=beta) break;
  }

  return best;
}

function chooseBotMove(){
  const moves=orderedMoves(botColor);
  if(!moves.length) return null;

  // Mobile-friendly search. Depth 3 gives a meaningful tactical bot
  // without freezing the phone for too long.
  const depth=3;

  let bestMove=moves[0];
  let best=-Infinity;

  for(const m of moves){
    const u=applyTemp(m);
    const v=minimax(
      depth-1,
      -Infinity,
      Infinity,
      false
    );
    undoTemp(m,u);

    if(v>best){
      best=v;
      bestMove=m;
    }
  }

  return bestMove;
}

function startBotTurn(){
  if(gameOver || !botEnabled || turn!==botColor) return;

  botThinking=true;
  render();

  if(aiTimer) clearTimeout(aiTimer);

  aiTimer=setTimeout(()=>{
    aiTimer=null;

    if(gameOver || !botEnabled || turn!==botColor){
      botThinking=false;
      render();
      return;
    }

    const m=chooseBotMove();

    if(!m){
      botThinking=false;
      render();
      return;
    }

    move(m.r,m.c,m.rr,m.cc,true);
  },180);
}

function toggleBot(){
  botEnabled=!botEnabled;
  botThinking=false;

  if(aiTimer){
    clearTimeout(aiTimer);
    aiTimer=null;
  }

  render();

  if(botEnabled && turn===botColor)
    startBotTurn();
}

/* ---------------- Reset / controls ---------------- */

function resetGame(){
  if(aiTimer){
    clearTimeout(aiTimer);
    aiTimer=null;
  }

  stopClock();

  initial();

  turn="white";
  selected=null;
  gameOver=false;
  drag=null;
  botThinking=false;
  captureCount=0;

  clocks={white:1800,black:1800};

  resetCounting();

  const overlay=document.getElementById("resultOverlay");
  if(overlay) overlay.classList.remove("show");

  ensureResultOverlay();
  render();
  startClock();

  if(botEnabled && turn===botColor)
    startBotTurn();
}

function bindControls(){
  const botBtn=document.getElementById("botBtn");
  if(botBtn) botBtn.onclick=toggleBot;

  const restartIds=[
    "restartBtn","resetBtn","newGameBtn",
    "playAgainBtn","againBtn"
  ];

  for(const id of restartIds){
    const el=document.getElementById(id);
    if(el) el.onclick=resetGame;
  }

  const stop=document.getElementById("countStopBtn");
  if(stop) stop.onclick=toggleCountingPause;

  const draw=document.getElementById("countDrawBtn");
  if(draw) draw.onclick=declareCountingDraw;
}

/* Public API for existing HTML */
window.OukGame={
  get board(){return board},
  get turn(){return turn},
  get counting(){return counting},
  reset:resetGame,
  move,
  legal,
  inCheck,
  hasMove,
  startBotTurn,
  toggleBot,
  startCounting,
  stopCounting,
  declareCountingDraw
};

document.addEventListener("DOMContentLoaded",()=>{
  ensureResultOverlay();
  bindControls();
  resetGame();
});
