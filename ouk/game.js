const TYPES={rook:"ទូក",knight:"សេះ",bishop:"គោល",queen:"នាង",king:"ស្តេច",pawn:"ត្រី"};
const IMG={white:{rook:"assets/white_rook.png",knight:"assets/white_knight.png",bishop:"assets/white_bishop.png",queen:"assets/white_queen.png",king:"assets/white_king.png",pawn:"assets/white_pawn.png"},black:{rook:"assets/black_rook.png",knight:"assets/black_knight.png",bishop:"assets/black_bishop.png",queen:"assets/black_queen.png",king:"assets/black_king.png",pawn:"assets/black_pawn.png"}};

let board=[],turn="white",selected=null,gameOver=false,timer=null,drag=null,botEnabled=true,botColor="black",botThinking=false,aiTimer=null,captureCount=0;
let clocks={white:1800,black:1800};

/*
  OUK CHAKTRANG RULE CORE
  - 8x8 board; Trey start on rows 3 and 6 (index 2 / 5).
  - White: R N B K Q B N R
  - Black: R N B Q K B N R
  - Trey: one step forward, captures diagonally; no double move/en-passant.
  - Trey promotes to Neang when it reaches the opponent's original Trey rank.
  - Neang: one diagonal step; on its first move it may jump two squares forward,
    but that special jump cannot capture.
  - Koul: one diagonal step or one forward step.
  - Ses: normal knight.
  - Touk: normal rook.
  - Khon: one square any direction; on its first move it may make the special
    knight jump to b2/f2 (white) or c7/g7 (black), only when not in check,
    only if the destination is empty, and only if an enemy Touk has not already
    aimed at the king along its rank/file. Castling does not exist.
  - Normal legal-move rule: a move may not leave your own king in check.
  - Game ends by checkmate, stalemate, timeout, or an explicit king-capture
    position if one is ever reached through a malformed/imported position.
  - Counting rules are implemented below.
*/

const BACK_WHITE=["rook","knight","bishop","king","queen","bishop","knight","rook"];
const BACK_BLACK=["rook","knight","bishop","queen","king","bishop","knight","rook"];

function initial(){
  board=Array.from({length:8},()=>Array(8).fill(null));
  for(let c=0;c<8;c++){
    board[0][c]={color:"black",type:BACK_BLACK[c],moved:false,kingJumpLost:false};
    board[2][c]={color:"black",type:"pawn",moved:false,promoted:false};
    board[5][c]={color:"white",type:"pawn",moved:false,promoted:false};
    board[7][c]={color:"white",type:BACK_WHITE[c],moved:false,kingJumpLost:false};
  }
}
function inb(r,c){return r>=0&&r<8&&c>=0&&c<8}
function clone(){return board.map(row=>row.map(p=>p?{...p}:null))}
function add(out,r,c,p,allowKingTarget=false){
  if(!inb(r,c))return;
  const t=board[r][c];
  if(!t)out.push([r,c]);
  else if(t.color!==p.color&&(allowKingTarget||t.type!=="king"))out.push([r,c]);
}
function rayMoves(r,c,dirs,color){
  const out=[];
  for(const[dr,dc]of dirs){
    let rr=r+dr,cc=c+dc;
    while(inb(rr,cc)){
      const t=board[rr][cc];
      if(!t)out.push([rr,cc]);
      else{
        if(t.color!==color&&t.type!=="king")out.push([rr,cc]);
        break;
      }
      rr+=dr;cc+=dc;
    }
  }
  return out;
}

function pseudo(r,c,attacks=false){
  const p=board[r]?.[c];if(!p)return[];
  const out=[];const f=p.color==="white"?-1:1;
  if(p.type==="king"){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(out,r+dr,c+dc,p);
    // Special Khon jump: b2/f2 for White, c7/g7 for Black.
    // It is a non-capturing move and cannot be used while in check.
    if(!attacks&&!p.moved&&!p.kingJumpLost&&captureCount===0&&!inCheck(p.color)){
      for(const dc of[-2,2]){
        const rr=r+f,cc=c+dc;
        if(inb(rr,cc)&&!board[rr][cc])out.push([rr,cc]);
      }
    }
  }
  if(p.type==="queen"){
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
    if(!attacks&&!p.moved&&captureCount===0&&inb(r+2*f,c)&&!board[r+f][c]&&!board[r+2*f][c])out.push([r+2*f,c]);
  }
  if(p.type==="bishop"){
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
    add(out,r+f,c,p);
  }
  if(p.type==="knight"){
    [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
  }
  if(p.type==="rook")return rayMoves(r,c,[[1,0],[-1,0],[0,1],[0,-1]],p.color);
  if(p.type==="pawn"){
    if(!attacks&&inb(r+f,c)&&!board[r+f][c])out.push([r+f,c]);
    for(const dc of[-1,1]){
      const rr=r+f,cc=c+dc;if(!inb(rr,cc))continue;
      if(attacks){if(board[rr][cc]?.type!=="king")out.push([rr,cc]);}
      else if(board[rr][cc]&&board[rr][cc].color!==p.color&&board[rr][cc].type!=="king")out.push([rr,cc]);
    }
  }
  return out;
}

function attacked(r,c,by){
  for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
    const p=board[rr][cc];if(!p||p.color!==by)continue;
    if(pseudo(rr,cc,true).some(([a,b])=>a===r&&b===c))return true;
  }
  return false;
}
function findKing(color){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&board[r][c]?.type==="king")return[r,c];
  return null;
}
function inCheck(color){
  const k=findKing(color);return k?attacked(k[0],k[1],color==="white"?"black":"white"):true;
}
function legal(r,c){
  const p=board[r]?.[c];if(!p)return[];
  return pseudo(r,c).filter(([rr,cc])=>{
    const target=board[rr][cc];
    // Kings are never a normal destination in the legal move list. A legal
    // Ouk game ends at checkmate; the capture branch in move() only protects
    // imported/corrupt positions where a king is already on a target square.
    if(target?.type==="king")return false;
    const save=clone();
    board[rr][cc]=p;board[r][c]=null;
    const ok=!inCheck(p.color);
    board=save;return ok;
  });
}
function hasMove(color){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&legal(r,c).length)return true;
  return false;
}
function allLegal(color){
  const out=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color){
    for(const[rr,cc]of legal(r,c))out.push({r,c,rr,cc,capture:!!board[rr][cc]});
  }
  return out;
}

function rookAimsKing(color){
  const k=findKing(color);if(!k)return false;
  const enemy=color==="white"?"black":"white";
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c];if(!p||p.color!==enemy||p.type!=="rook")continue;
    if(r!==k[0]&&c!==k[1])continue;
    const dr=Math.sign(k[0]-r),dc=Math.sign(k[1]-c);let rr=r+dr,cc=c+dc,clear=true;
    while(rr!==k[0]||cc!==k[1]){if(board[rr][cc]){clear=false;break}rr+=dr;cc+=dc}
    if(clear)return true;
  }
  return false;
}
function updateKingJumpRights(){
  for(const color of["white","black"]){
    const k=findKing(color);if(!k)continue;
    const king=board[k[0]][k[1]];
    if(king&&!king.moved&&rookAimsKing(color))king.kingJumpLost=true;
  }
}

function cellAtPoint(x,y){
  const b=document.getElementById("board"),rect=b.getBoundingClientRect();
  const c=Math.floor((x-rect.left)/(rect.width/8)),r=Math.floor((y-rect.top)/(rect.height/8));
  return inb(r,c)?[r,c]:null;
}
function clearDropTargets(){document.querySelectorAll(".drop-target").forEach(x=>x.classList.remove("drop-target"))}
function markTargets(){
  clearDropTargets();if(!selected)return;
  legal(...selected).forEach(([r,c])=>document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`)?.classList.add("drop-target"));
}
function render(){
  const el=document.getElementById("board");el.innerHTML="";
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cell=document.createElement("div");cell.className="cell";cell.style.left=c*12.5+"%";cell.style.top=r*12.5+"%";cell.dataset.r=r;cell.dataset.c=c;
    if(selected?.[0]===r&&selected?.[1]===c)cell.classList.add("selected");
    if(selected&&legal(...selected).some(x=>x[0]===r&&x[1]===c))cell.classList.add(board[r][c]?"capture":"legal");
    if(board[r][c]?.type==="king"&&inCheck(board[r][c].color))cell.classList.add("check");
    cell.addEventListener("click",()=>clickCell(r,c));
    const p=board[r][c];
    if(p){
      const img=document.createElement("img");img.className="piece"+(selected?.[0]===r&&selected?.[1]===c?" selected-piece":"");
      img.src=IMG[p.color][p.type];img.alt=TYPES[p.type];img.draggable=false;img.dataset.r=r;img.dataset.c=c;
      img.addEventListener("pointerdown",e=>startDrag(e,r,c));img.addEventListener("click",e=>{e.stopPropagation();clickCell(r,c)});cell.appendChild(img);
    }
    el.appendChild(cell);
  }
  const who=turn==="white"?"ភាគីស":"ភាគីខ្មៅ";
  document.getElementById("turnLabel").textContent=gameOver?"ការប្រកួតបញ្ចប់":(botThinking?"🤖 បតកំពុងគិត…":"វេន "+who);
  if(!gameOver)document.getElementById("status").textContent=inCheck(turn)?`⚠️ ${who} កំពុងជាប់អុក`:(botThinking?"🤖 បតកំពុងគិតដំណើរល្អបំផុត…":"ចុច/អូសកូនអុក → ក្រឡាដែលចង់ដើរ");
  updateClock();renderCounting();markTargets();
  const botBtn=document.getElementById("botBtn");if(botBtn)botBtn.textContent=botEnabled?"🤖 បត: បើក":"👤 លេងមនុស្សទាំងពីរ";
}
function clickCell(r,c){
  if(gameOver||drag||botThinking||(botEnabled&&turn===botColor))return;
  const p=board[r][c];
  if(selected){
    const ok=legal(...selected).some(x=>x[0]===r&&x[1]===c);
    if(ok){move(...selected,r,c);return}
    if(p&&p.color===turn){selected=[r,c];render();return}
    selected=null;render();return;
  }
  if(p&&p.color===turn){selected=[r,c];render()}
}
function startDrag(e,r,c){
  if(gameOver||botThinking||!board[r][c]||board[r][c].color!==turn||(botEnabled&&turn===botColor))return;
  e.preventDefault();selected=[r,c];render();
  const img=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .piece`);if(!img)return;
  const rect=img.getBoundingClientRect(),ghost=img.cloneNode(true);ghost.className="drag-ghost";ghost.style.setProperty("--piece-size",Math.min(rect.width,rect.height)+"px");ghost.style.left=e.clientX+"px";ghost.style.top=e.clientY+"px";
  document.body.appendChild(ghost);img.style.visibility="hidden";drag={r,c,img,ghost};markTargets();
  document.addEventListener("pointermove",dragMove,{passive:false});document.addEventListener("pointerup",dragEnd,{once:true});
}
function dragMove(e){
  if(!drag)return;e.preventDefault();drag.ghost.style.left=e.clientX+"px";drag.ghost.style.top=e.clientY+"px";clearDropTargets();
  const t=cellAtPoint(e.clientX,e.clientY);if(t&&legal(drag.r,drag.c).some(x=>x[0]===t[0]&&x[1]===t[1]))document.querySelector(`.cell[data-r="${t[0]}"][data-c="${t[1]}"]`)?.classList.add("drop-target");
}
function dragEnd(e){
  if(!drag)return;document.removeEventListener("pointermove",dragMove);const d=drag,t=cellAtPoint(e.clientX,e.clientY);const ok=t&&legal(d.r,d.c).some(x=>x[0]===t[0]&&x[1]===t[1]);
  d.ghost.remove();d.img.style.visibility="visible";drag=null;clearDropTargets();if(ok)move(d.r,d.c,t[0],t[1]);else{selected=[d.r,d.c];render()}
}

function promoteIfNeeded(r,c,p){
  if(p.type!=="pawn")return false;
  const promotionRow=p.color==="white"?2:5;
  if(r===promotionRow){p.type="queen";p.promoted=true;return true}
  return false;
}

/* ---------------- Counting rules ---------------- */
let counting={mode:null,active:false,paused:false,counterColor:null,count:0,limit:0,reason:"",startedAtPieces:0};
function pieceTotal(color){let n=0;for(const row of board)for(const p of row)if(p?.color===color)n++;return n}
function materialList(color){const a=[];for(const row of board)for(const p of row)if(p?.color===color)a.push(p);return a}
function materialScore(color){
  const V={pawn:1,queen:2,bishop:3,knight:4,rook:5,king:0};
  return materialList(color).reduce((s,p)=>s+(V[p.type]||0),0);
}
function hasUnpromotedPawn(){for(const row of board)for(const p of row)if(p?.type==="pawn")return true;return false}
function bareKingColor(){
  for(const color of["white","black"]){const ps=materialList(color);if(ps.length===1&&ps[0].type==="king")return color}
  return null;
}
function escapingColor(){
  const w=pieceTotal("white"),b=pieceTotal("black");
  if(w<=3&&b>3)return"white";if(b<=3&&w>3)return"black";
  if(w<=3&&b<=3){const mw=materialScore("white"),mb=materialScore("black");if(mw!==mb)return mw<mb?"white":"black";if(w!==b)return w<b?"white":"black";}
  return null;
}
function pieceLimit(chasingColor){
  const ps=materialList(chasingColor).filter(p=>p.type!=="king"&&p.type!=="pawn");
  const q=ps.filter(p=>p.type==="queen").length;
  const r=ps.filter(p=>p.type==="rook").length;
  const b=ps.filter(p=>p.type==="bishop").length;
  const n=ps.filter(p=>p.type==="knight").length;
  // Standard published minimum-limit table.
  if(r>=2)return 8;
  if(r>=1)return 16;
  if(b>=2)return 22;
  if(n>=2)return 32;
  if(b>=1)return 44;
  if(n>=1)return 64;
  if(q>=1)return 64;
  // Promoted pawns are stored as queen + promoted=true, so q covers them.
  return 64;
}
function countingEligible(){
  const bare=bareKingColor();
  if(!hasUnpromotedPawn()&&bare){
    const chasing=bare==="white"?"black":"white";
    return {mode:"piece",counterColor:bare,limit:pieceLimit(chasing)};
  }
  const esc=escapingColor();
  if(esc)return {mode:"board",counterColor:esc,limit:64};
  return null;
}
function resetCounting(){counting={mode:null,active:false,paused:false,counterColor:null,count:0,limit:0,reason:"",startedAtPieces:0}}
function startCounting(force=false){
  const e=countingEligible();if(!e)return false;
  if(!force&&counting.active)return true;
  counting.mode=e.mode;counting.active=true;counting.paused=false;counting.counterColor=e.counterColor;counting.limit=e.limit;counting.startedAtPieces=pieceTotal("white")+pieceTotal("black");
  counting.count=e.mode==="piece"?counting.startedAtPieces+1:1;
  counting.reason=e.mode==="piece"?"Piece's Honor Counting":"Board's Honor Counting";return true;
}
function stopCounting(){if(!counting.active)return;counting.active=false;counting.paused=true}
function countingText(){
  if(!counting.active&&!counting.paused)return"";
  const who=counting.counterColor==="white"?"ភាគីស":"ភាគីខ្មៅ";
  return `📿 ${counting.reason} • ${who}: ${counting.count}/${counting.limit}`;
}
function renderCounting(){
  const bar=document.getElementById("countBar");if(!bar)return;
  const text=document.getElementById("countText"),stop=document.getElementById("countStopBtn"),draw=document.getElementById("countDrawBtn");
  if(counting.active){bar.classList.add("show");text.textContent=countingText();stop.textContent=counting.mode==="board"?"⏸ បញ្ឈប់ការរាប់":"🔒 ក្បួនរាប់ថេរ";stop.disabled=counting.mode!=="board";draw.disabled=false;}
  else if(counting.paused){bar.classList.add("show");text.textContent="📿 ការរាប់ត្រូវបានបញ្ឈប់ • ចាប់រាប់ឡើងវិញបាន";stop.textContent="▶ ចាប់រាប់ឡើងវិញ";stop.disabled=false;draw.disabled=false;}
  else bar.classList.remove("show");
}
function showResult(winner,reason){
  gameOver=true;botThinking=false;stopTimer();if(aiTimer){clearTimeout(aiTimer);aiTimer=null}
  const overlay=document.getElementById("resultOverlay");document.getElementById("resultTitle").textContent=winner?"ឈ្នះ!":"ស្មើ!";document.getElementById("resultTitle").className=winner?"win":"draw";
  document.getElementById("resultText").textContent=winner?`${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះហើយ!`:reason;overlay.classList.add("show");
}
function afterMoveCounting(moverColor,captured,terminal){
  const before={...counting};
  const eligible=countingEligible();
  // Piece Honor overrides Board Honor once the bare-king condition is reached.
  if(eligible?.mode==="piece"&&(!counting.active||counting.mode!=="piece"))startCounting(true);
  else if(!counting.active&&!counting.paused&&eligible)startCounting(false);

  if(counting.active&&counting.counterColor===moverColor){
    const justStarted=!before.active||before.mode!==counting.mode;
    if(!justStarted)counting.count++;
  }

  // If the escaping/counting side checkmates while its count is still running,
  // the result is a draw unless that side stopped the Board Honor count first.
  if(counting.active&&counting.counterColor===moverColor&&terminal?.checkmate){
    showResult(null,"អ្នករាប់ដំណើរបានអុកចប់ ប៉ុន្តែក្បួនរាប់នៅដំណើរការ — ប្រកួតស្មើ");
    return true;
  }
  if(counting.active&&counting.count>=counting.limit){
    showResult(null,`${counting.reason} ដល់កំណត់ ${counting.limit} — ប្រកួតស្មើ`);
    return true;
  }
  renderCounting();return false;
}
function declareCountingDraw(){
  if(!counting.active&&!counting.paused)return;
  showResult(null,"ប្រកួតស្មើតាមក្បួនរាប់ដំណើរ");
}
function toggleCountingPause(){if(counting.mode!=="board")return;if(counting.active){stopCounting();renderCounting()}else if(counting.paused){startCounting(true);renderCounting()}}

function move(r,c,rr,cc,fromAI=false){
  if(gameOver)return;
  const p=board[r]?.[c];if(!p||p.color!==turn)return;
  const allowed=legal(r,c).some(([a,b])=>a===rr&&b===cc);if(!allowed)return;
  const captured=board[rr][cc];
  // Defensive king-capture handling for imported/malformed positions.
  if(captured?.type==="king"){
    const winner=p.color;board[rr][cc]=p;board[r][c]=null;selected=null;render();showResult(winner,"ស្តេចត្រូវបានស៊ី — ភាគីម្ខាងទៀតចាញ់");return;
  }
  board[rr][cc]=p;board[r][c]=null;p.moved=true;if(captured)captureCount++;
  const promoted=promoteIfNeeded(rr,cc,p);
  updateKingJumpRights();
  const moverColor=turn;turn=turn==="white"?"black":"white";selected=null;botThinking=false;render();
  const landed=document.querySelector(`.cell[data-r="${rr}"][data-c="${cc}"] .piece`);if(landed){landed.classList.add("move-land");setTimeout(()=>landed.classList.remove("move-land"),360)}
  if(promoted)document.getElementById("status").textContent=`✨ ${moverColor==="white"?"ភាគីស":"ភាគីខ្មៅ"}៖ ត្រីបានបកជា នាង`;

  const opp=turn,chk=inCheck(opp),moves=hasMove(opp);
  if(afterMoveCounting(moverColor,!!captured,{checkmate:!moves&&chk,stalemate:!moves&&!chk}))return;
  if(!moves){
    if(chk){const winner=opp==="white"?"black":"white";document.getElementById("status").textContent=`🏆 ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ — Checkmate`;render();setTimeout(()=>showResult(winner,"Checkmate — ស្តេចត្រូវបានអុកចប់"),180)}
    else{document.getElementById("status").textContent="🤝 ប្រកួតស្មើ — Stalemate";render();setTimeout(()=>showResult(null,"Stalemate — គ្មានដំណើរស្របច្បាប់"),180)}
    return;
  }
  if(!fromAI&&botEnabled&&turn===botColor)startBotTurn();
}

/* ---------------- Bot ---------------- */
const VALUE={pawn:100,bishop:320,knight:420,rook:650,queen:900,king:20000};
const CENTER=[[0,0,0,0,0,0,0,0],[0,4,6,7,7,6,4,0],[0,6,10,12,12,10,6,0],[0,7,12,15,15,12,7,0],[0,7,12,15,15,12,7,0],[0,6,10,12,12,10,6,0],[0,4,6,7,7,6,4,0],[0,0,0,0,0,0,0,0]];
function snapshot(){return{b:clone(),turn,captureCount,counting:{...counting}}}
function restore(s){board=s.b;turn=s.turn;captureCount=s.captureCount;counting={...s.counting}}
function applyTemp(m){
  const p=board[m.r][m.c],capt=board[m.rr][m.cc];board[m.rr][m.cc]=p;board[m.r][m.c]=null;const old={moved:p.moved,kingJumpLost:p.kingJumpLost,captureCount};p.moved=true;if(capt)captureCount++;const promoted=promoteIfNeeded(m.rr,m.cc,p);return{p,capt,old,promoted};
}
function undoTemp(m,u){const p=board[m.rr][m.cc];if(u.promoted){p.type="pawn";p.promoted=false}p.moved=u.old.moved;p.kingJumpLost=u.old.kingJumpLost;captureCount=u.old.captureCount;board[m.r][m.c]=p;board[m.rr][m.cc]=u.capt}
function evaluate(forColor){
  let score=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!p)continue;let v=VALUE[p.type]||0,pos=CENTER[r][c]||0;if(p.type==="pawn")pos+=(p.color==="white"?7-r:r)*5;if(p.type==="king"&&inCheck(p.color))v-=80;score+=(p.color===forColor?1:-1)*(v+pos)}
  score+=(allLegal(forColor).length-allLegal(forColor==="white"?"black":"white").length)*2;return score;
}
function terminalScore(color,depth){const moves=hasMove(color);if(moves)return null;return inCheck(color)?(color===botColor?-100000-depth:100000+depth):0}
function orderedMoves(color){
  const ms=allLegal(color);ms.forEach(m=>{const t=board[m.rr][m.cc];m.order=(t?VALUE[t.type]*10:0)+((m.rr===2||m.rr===5)&&board[m.r][m.c]?.type==="pawn"?500:0)+(CENTER[m.rr][m.cc]||0)});return ms.sort((a,b)=>b.order-a.order);
}
function minimax(depth,alpha,beta,maximizing){
  const color=maximizing?botColor:(botColor==="white"?"black":"white"),terminal=terminalScore(color,depth);if(terminal!==null)return terminal;if(depth<=0)return evaluate(botColor);
  const moves=orderedMoves(color);
  if(maximizing){let best=-Infinity;for(const m of moves){const u=applyTemp(m),v=minimax(depth-1,alpha,beta,false);undoTemp(m,u);if(v>best)best=v;if(best>alpha)alpha=best;if(alpha>=beta)break}return best}
  let best=Infinity;for(const m of moves){const u=applyTemp(m),v=minimax(depth-1,alpha,beta,true);undoTemp(m,u);if(v<best)best=v;if(best<beta)beta=best;if(alpha>=beta)break}return best;
}
function chooseBotMove(){
  const moves=orderedMoves(botColor);if(!moves.length)return null;const candidates=moves.slice(0,24);let best=null,bestScore=-Infinity;
  for(const m of candidates){const u=applyTemp(m),score=minimax(2,-Infinity,Infinity,false);undoTemp(m,u);if(score>bestScore){bestScore=score;best=m}}
  return best;
}
function startBotTurn(){
  if(gameOver||!botEnabled||turn!==botColor)return;botThinking=true;render();if(aiTimer)clearTimeout(aiTimer);
  aiTimer=setTimeout(()=>{aiTimer=null;if(gameOver||turn!==botColor)return;const m=chooseBotMove();if(m)move(m.r,m.c,m.rr,m.cc,true);else{botThinking=false;render()}},420);
}
function toggleBot(){
  if(gameOver)return;botEnabled=!botEnabled;botThinking=false;if(aiTimer){clearTimeout(aiTimer);aiTimer=null}render();if(botEnabled&&turn===botColor)startBotTurn();
}

function fmt(s){s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function updateClock(){document.getElementById("whiteClock").textContent=fmt(clocks.white);document.getElementById("blackClock").textContent=fmt(clocks.black)}
function stopTimer(){clearInterval(timer);timer=null}
function startTimer(){
  stopTimer();timer=setInterval(()=>{if(gameOver)return;clocks[turn]--;updateClock();if(clocks[turn]<=0){clocks[turn]=0;const winner=turn==="white"?"black":"white";document.getElementById("status").textContent=`⏱️ ${turn==="white"?"ភាគីស":"ភាគីខ្មៅ"} អស់ពេល — ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ`;showResult(winner,"អស់ពេល")}},1000);
}
function reset(){
  document.getElementById("resultOverlay")?.classList.remove("show");stopTimer();if(aiTimer){clearTimeout(aiTimer);aiTimer=null}
  initial();updateKingJumpRights();captureCount=0;turn="white";selected=null;gameOver=false;drag=null;botThinking=false;clocks={white:1800,black:1800};resetCounting();render();startTimer();
}

document.getElementById("resetBtn").onclick=reset;
document.getElementById("newGameBtn").onclick=reset;
document.getElementById("playAgainBtn").onclick=reset;
document.getElementById("botBtn").onclick=toggleBot;
document.getElementById("countStopBtn")?.addEventListener("click",toggleCountingPause);
document.getElementById("countDrawBtn")?.addEventListener("click",declareCountingDraw);
document.getElementById("helpBtn").onclick=()=>document.getElementById("helpModal").classList.add("show");
document.getElementById("closeHelp").onclick=()=>document.getElementById("helpModal").classList.remove("show");
document.getElementById("helpModal").onclick=e=>{if(e.target.id==="helpModal")e.currentTarget.classList.remove("show")};
reset();
