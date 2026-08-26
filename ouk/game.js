const TYPES={rook:"ទូក",knight:"សេះ",bishop:"គោល",queen:"នាង",king:"ស្តេច",pawn:"ត្រី"};
const IMG={white:{rook:"assets/white_rook.png",knight:"assets/white_knight.png",bishop:"assets/white_bishop.png",queen:"assets/white_queen.png",king:"assets/white_king.png",pawn:"assets/white_pawn.png"},black:{rook:"assets/black_rook.png",knight:"assets/black_knight.png",bishop:"assets/black_bishop.png",queen:"assets/black_queen.png",king:"assets/black_king.png",pawn:"assets/black_pawn.png"}};

let board=[],turn="white",selected=null,gameOver=false,timer=null,drag=null,capturedAny=false;
let moveCount=0;
let clocks={white:1800,black:1800};

// Ouk Chatrang endgame honor-counting state.
// Based on the Ouk Chatrang counting rules: board honor counting is 64;
// bare-king piece counting uses 8/16/22/32/44/64 depending on the stronger side's material.
let counting={mode:null,active:false,paused:false,counterColor:null,count:0,limit:0,reason:"",startedAtPieces:0};
let botEnabled=true,botColor="black",botThinking=false,aiTimer=null;

// Ouk Chatrang: kings are crosswise; Neang is on the king's right;
// Trey are on the 3rd and 6th ranks.
const BACK=["rook","knight","bishop","king","queen","bishop","knight","rook"];
function initial(){
  board=Array.from({length:8},()=>Array(8).fill(null));
  for(let c=0;c<8;c++){
    board[0][c]={color:"black",type:BACK[c],moved:false,kingJumpLost:false};
    board[2][c]={color:"black",type:"pawn",moved:false};
    board[5][c]={color:"white",type:"pawn",moved:false};
    board[7][c]={color:"white",type:BACK[c],moved:false,kingJumpLost:false};
  }
}
function inb(r,c){return r>=0&&r<8&&c>=0&&c<8}
function rayMoves(r,c,dirs,color){const out=[];for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc;while(inb(rr,cc)){if(!board[rr][cc])out.push([rr,cc]);else{if(board[rr][cc].color!==color)out.push([rr,cc]);break}rr+=dr;cc+=dc}}return out}
function add(out,r,c,p){if(inb(r,c)&&(!board[r][c]||board[r][c].color!==p.color))out.push([r,c])}

function pseudo(r,c,attacks=false){
  const p=board[r][c];if(!p)return[];const out=[];
  const forward=p.color==="white"?-1:1;
  if(p.type==="king"){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(out,r+dr,c+dc,p);
    // Ouk opening king knight-jump: first move only, cannot capture, and disabled after rook-aim.
    if(!attacks&&!p.moved&&!p.kingJumpLost&&!inCheck(p.color))for(const dc of [-2,2]){
      const rr=r+forward,cc=c+dc;
      if(inb(rr,cc)&&!board[rr][cc])out.push([rr,cc]);
    }
  }
  if(p.type==="queen"){
    // Neang: one step diagonally; special first move is two straight forward.
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
    if(!attacks&&!p.moved&&inb(r+forward*2,c)&&!board[r+forward][c]&&!board[r+forward*2][c])out.push([r+forward*2,c]);
  }
  if(p.type==="bishop"){
    // Koul: one diagonal step or one step straight forward.
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
    add(out,r+forward,c,p);
  }
  if(p.type==="knight")[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
  if(p.type==="rook")return rayMoves(r,c,[[1,0],[-1,0],[0,1],[0,-1]],p.color);
  if(p.type==="pawn"){
    // No two-square first move and no en-passant.
    if(!attacks&&inb(r+forward,c)&&!board[r+forward][c])out.push([r+forward,c]);
    for(const dc of[-1,1])if(inb(r+forward,c+dc)){
      if(attacks)out.push([r+forward,c+dc]);
      else if(board[r+forward][c+dc]&&board[r+forward][c+dc].color!==p.color)out.push([r+forward,c+dc]);
    }
  }
  return out;
}
function clone(){return board.map(row=>row.map(p=>p?{...p}:null))}
function attacked(r,c,by){for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){const p=board[rr][cc];if(!p||p.color!==by)continue;if(pseudo(rr,cc,true).some(([a,b])=>a===r&&b===c))return true}return false}
function inCheck(color){let k=null;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&board[r][c]?.type==="king")k=[r,c];return k?attacked(k[0],k[1],color==="white"?"black":"white"):true}
function legal(r,c){const p=board[r][c];if(!p)return[];return pseudo(r,c).filter(([rr,cc])=>{const target=board[rr][cc];const save=clone();board[rr][cc]=p;board[r][c]=null;const ok=!inCheck(p.color);board=save;return ok})}
function hasMove(color){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&legal(r,c).length)return true;return false}
function allLegal(color){const out=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){if(board[r][c]?.color!==color)continue;for(const [rr,cc] of legal(r,c))out.push({r,c,rr,cc,capture:!!board[rr][cc]})}return out}

function cellAtPoint(x,y){const b=document.getElementById("board"),rect=b.getBoundingClientRect();const c=Math.floor((x-rect.left)/(rect.width/8)),r=Math.floor((y-rect.top)/(rect.height/8));return inb(r,c)?[r,c]:null}
function clearDropTargets(){document.querySelectorAll(".drop-target").forEach(x=>x.classList.remove("drop-target"))}
function markTargets(){clearDropTargets();if(!selected)return;legal(...selected).forEach(([r,c])=>{const e=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);if(e)e.classList.add("drop-target")})}
function render(){
  const el=document.getElementById("board");el.innerHTML="";
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cell=document.createElement("div");cell.className="cell";cell.style.left=(c*12.5)+"%";cell.style.top=(r*12.5)+"%";cell.dataset.r=r;cell.dataset.c=c;
    if(selected&&selected[0]===r&&selected[1]===c)cell.classList.add("selected");
    if(selected&&legal(...selected).some(x=>x[0]===r&&x[1]===c))cell.classList.add(board[r][c]?"capture":"legal");
    if(board[r][c]?.type==="king"&&inCheck(board[r][c].color))cell.classList.add("check");
    cell.addEventListener("click",()=>clickCell(r,c));
    const p=board[r][c];
    if(p){const img=document.createElement("img");img.className="piece"+(selected&&selected[0]===r&&selected[1]===c?" selected-piece":"");img.src=IMG[p.color][p.type];img.alt=TYPES[p.type];img.draggable=false;img.dataset.r=r;img.dataset.c=c;img.addEventListener("pointerdown",e=>startDrag(e,r,c));img.addEventListener("click",e=>{e.stopPropagation();clickCell(r,c)});cell.appendChild(img)}
    el.appendChild(cell);
  }
  const who=turn==="white"?"ភាគីស":"ភាគីខ្មៅ";
  document.getElementById("turnLabel").textContent=gameOver?"ការប្រកួតបញ្ចប់":(botThinking?"🤖 បតកំពុងគិត…":"វេន "+who);
  if(!gameOver){document.getElementById("status").textContent=inCheck(turn)?`⚠️ ${who} កំពុងជាប់អុក`:(botThinking?"🤖 បតកំពុងគិតដំណើរល្អបំផុត…":"ចុច/អូសកូនអុក → ក្រឡាដែលចង់ដើរ")}
  markTargets();updateClock();renderCounting();
  const botBtn=document.getElementById("botBtn");if(botBtn)botBtn.textContent=botEnabled?"🤖 បត: បើក":"👤 លេងមនុស្សទាំងពីរ";
}
function clickCell(r,c){if(gameOver||drag||botThinking||(botEnabled&&turn===botColor))return;const p=board[r][c];if(selected){const ok=legal(...selected).some(x=>x[0]===r&&x[1]===c);if(ok){move(...selected,r,c);return}if(p&&p.color===turn){selected=[r,c];render();return}selected=null;render();return}if(p&&p.color===turn){selected=[r,c];render()}}
function startDrag(e,r,c){if(gameOver||botThinking||!board[r][c]||board[r][c].color!==turn||(botEnabled&&turn===botColor))return;e.preventDefault();selected=[r,c];render();const img=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .piece`);if(!img)return;const rect=img.getBoundingClientRect(),ghost=img.cloneNode(true);ghost.className="drag-ghost";ghost.style.setProperty("--piece-size",Math.min(rect.width,rect.height)+"px");ghost.style.left=e.clientX+"px";ghost.style.top=e.clientY+"px";document.body.appendChild(ghost);img.style.visibility="hidden";drag={r,c,img,ghost};markTargets();document.addEventListener("pointermove",dragMove,{passive:false});document.addEventListener("pointerup",dragEnd,{once:true})}
function dragMove(e){if(!drag)return;e.preventDefault();drag.ghost.style.left=e.clientX+"px";drag.ghost.style.top=e.clientY+"px";const target=cellAtPoint(e.clientX,e.clientY);clearDropTargets();if(target&&legal(drag.r,drag.c).some(x=>x[0]===target[0]&&x[1]===target[1]))document.querySelector(`.cell[data-r="${target[0]}"][data-c="${target[1]}"]`)?.classList.add("drop-target")}
function dragEnd(e){if(!drag)return;document.removeEventListener("pointermove",dragMove);const d=drag,target=cellAtPoint(e.clientX,e.clientY);const ok=target&&legal(d.r,d.c).some(x=>x[0]===target[0]&&x[1]===target[1]);d.ghost.remove();d.img.style.visibility="visible";drag=null;clearDropTargets();if(ok)move(d.r,d.c,target[0],target[1]);else{selected=[d.r,d.c];render()}}

function pieceTotal(color){let n=0;for(const row of board)for(const p of row)if(p&&p.color===color)n++;return n}
function materialList(color){const out=[];for(const row of board)for(const p of row)if(p&&p.color===color)out.push(p);return out}
function hasUnpromotedPawn(){for(const row of board)for(const p of row)if(p&&p.type==="pawn")return true;return false}
function bareKingColor(){for(const color of ["white","black"]){const ps=materialList(color);if(ps.length===1&&ps[0].type==="king")return color}return null}
function strongerColor(){const bw=materialScore("white"),bb=materialScore("black");if(bw===bb)return null;return bw>bb?"white":"black"}
function materialScore(color){let s=0;for(const p of materialList(color)){if(p.type==="king")continue;s+=VALUE[p.type]||0}return s}
function pieceHonorLimit(color){const ps=materialList(color).filter(p=>p.type!=="king"&&p.type!=="pawn");const rooks=ps.filter(p=>p.type==="rook").length;const bishops=ps.filter(p=>p.type==="bishop").length;const knights=ps.filter(p=>p.type==="knight").length;
  if(rooks>=2)return 8; if(rooks>=1)return 16; if(bishops>=2)return 22; if(knights>=2)return 32; if(bishops>=1)return 44; if(knights>=1)return 64; return 64;
}
function chooseEscapingColor(){const bw=pieceTotal("white"),bb=pieceTotal("black");if(bw!==bb)return bw<bb?"white":"black";const mw=materialScore("white"),mb=materialScore("black");if(mw!==mb)return mw<mb?"white":"black";return null}
function countingEligible(){const bare=bareKingColor();if(!hasUnpromotedPawn()&&bare){return {mode:"piece",counterColor:bare,limit:pieceHonorLimit(bare==="white"?"black":"white")}}
  const esc=chooseEscapingColor();if((pieceTotal("white")<=3||pieceTotal("black")<=3)&&esc){return {mode:"board",counterColor:esc,limit:64}}
  return null;
}
function resetCounting(){counting={mode:null,active:false,paused:false,counterColor:null,count:0,limit:0,reason:"",startedAtPieces:0};}
function startCounting(force=false){const e=countingEligible();if(!e)return false;if(!force&&counting.active)return true;counting.mode=e.mode;counting.active=true;counting.paused=false;counting.counterColor=e.counterColor;counting.limit=e.limit;counting.startedAtPieces=pieceTotal("white")+pieceTotal("black");counting.count=e.mode==="piece"?counting.startedAtPieces+1:1;counting.reason=e.mode==="piece"?"Bare King / Piece Honor Counting":"Board Honor Counting";return true}
function stopCounting(){if(!counting.active)return;counting.active=false;counting.paused=true}
function countingText(){if(!counting.active)return "";const who=counting.counterColor==="white"?"ភាគីស":"ភាគីខ្មៅ";return `📿 ក្បួនរាប់ដំណើរ • ${who}: ${counting.count}/${counting.limit}`}
function renderCounting(){const bar=document.getElementById("countBar");if(!bar)return;const text=document.getElementById("countText"),stop=document.getElementById("countStopBtn"),draw=document.getElementById("countDrawBtn");
  if(counting.active){bar.classList.add("show");text.textContent=countingText();stop.textContent=`⏸ បញ្ឈប់ការរាប់ (${counting.counterColor==="white"?"ស":"ខ"})`;draw.disabled=false;draw.textContent="🤝 ប្រកាសស្មើ";}else if(counting.paused){bar.classList.add("show");text.textContent="📿 ការរាប់ត្រូវបានបញ្ឈប់ • អាចចាប់រាប់ឡើងវិញ";stop.textContent="▶ ចាប់រាប់ឡើងវិញ";draw.disabled=false;draw.textContent="🤝 ប្រកាសស្មើ";}else{bar.classList.remove("show");}}
function afterMoveCounting(moverColor,captured){
  const before=counting.active?{...counting}:null;
  let restartedByCapture=false;
  // Escaping side capture: board honor counting stops. In bare-king piece counting,
  // a capture by the bare king starts a fresh piece count from the new material.
  if(before&&captured&&moverColor===before.counterColor){
    if(before.mode==="piece"){
      resetCounting();
      const e=countingEligible();
      if(e&&e.mode==="piece"){startCounting(true);restartedByCapture=true;}
      else if(e)counting={...counting};
    }else{
      resetCounting();
      renderCounting();
      return false;
    }
  }
  const e=countingEligible();
  // Piece Honor Counting overrides Board Honor Counting as soon as a bare king appears.
  if(e&&e.mode==="piece"&&(!counting.active||counting.mode!=="piece")){
    startCounting(true);
  }else if(!counting.active&&!counting.paused&&e){
    startCounting(false);
  }
  // The move that triggers a new count is already represented by the initial count;
  // only subsequent moves by the escaping player advance it.
  const justStarted=restartedByCapture||!before||!before.active||before.mode!==counting.mode;
  if(counting.active&&!justStarted&&counting.counterColor===moverColor){counting.count++;}
  if(counting.active&&counting.count>=counting.limit){
    showResult(null,`ក្បួនរាប់ដំណើរដល់ ${counting.limit} — ប្រកួតស្មើ`);
    return true;
  }
  renderCounting();
  return false;
}
function declareCountingDraw(){if(!counting.active&&!counting.paused)return;showResult(null,"ភាគីមានអត្ថប្រយោជន៍បានប្រកាសស្មើតាមក្បួនរាប់ដំណើរ");}
function toggleCountingPause(){if(counting.active){stopCounting();renderCounting();return}if(counting.paused){startCounting(true);renderCounting();}}

function showResult(winner,reason){gameOver=true;botThinking=false;stopTimer();if(aiTimer){clearTimeout(aiTimer);aiTimer=null}const overlay=document.getElementById("resultOverlay");document.getElementById("resultTitle").textContent=winner?"ឈ្នះ!":"ស្មើ!";document.getElementById("resultTitle").className=winner?"win":"draw";document.getElementById("resultText").textContent=winner?`${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះហើយ!`:reason;overlay.classList.add("show")}

// Important Ouk rule: Trey flips only after reaching the opponent's original Trey rank.
// White Trey promotes on rank 3 (row 2); Black Trey promotes on rank 6 (row 5).
function updateKingJumpRights(){
  for(const color of ["white","black"]){
    let king=null;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&board[r][c]?.type==="king")king=[r,c];
    if(!king)continue;
    const enemy=color==="white"?"black":"white";
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const p=board[r][c];
      if(!p||p.color!==enemy||p.type!=="rook")continue;
      if(r===king[0]||c===king[1]){
        const dr=Math.sign(king[0]-r),dc=Math.sign(king[1]-c);
        let rr=r+dr,cc=c+dc,clear=true;
        while(rr!==king[0]||cc!==king[1]){if(board[rr][cc]){clear=false;break}rr+=dr;cc+=dc}
        if(clear){board[king[0]][king[1]].kingJumpLost=true;break}
      }
    }
  }
}

function promoteIfNeeded(r,c,p){
  if(p.type!=="pawn")return false;
  const promotionRow=p.color==="white"?2:5;
  if(r===promotionRow){p.type="queen";p.promoted=true;return true}
  return false;
}
function move(r,c,rr,cc,fromAI=false){
  if(gameOver)return;
  const p=board[r][c];if(!p||p.color!==turn)return;
  const allowed=legal(r,c).some(([a,b])=>a===rr&&b===cc);if(!allowed)return;
  const captured=board[rr][cc];
  board[rr][cc]=p;board[r][c]=null;p.moved=true;if(captured)capturedAny=true;
  if(captured?.type==="king"){
    selected=null;botThinking=false;moveCount++;render();
    const winner=p.color;
    document.getElementById("status").textContent=`🏆 ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ — ស៊ីស្តេច`;
    setTimeout(()=>showResult(winner,"ស្តេចត្រូវបានស៊ី — ការប្រកួតបញ្ចប់"),180);
    return;
  }
  const promoted=promoteIfNeeded(rr,cc,p);
  moveCount++;
  updateKingJumpRights();
  turn=turn==="white"?"black":"white";selected=null;botThinking=false;render();
  const landed=document.querySelector(`.cell[data-r="${rr}"][data-c="${cc}"] .piece`);if(landed){landed.classList.add("move-land");setTimeout(()=>landed.classList.remove("move-land"),360)}
  if(promoted){document.getElementById("status").textContent=`✨ ${p.color==="white"?"ភាគីស":"ភាគីខ្មៅ"}៖ ត្រីបានបកជា នាង`;}
  const opp=turn,chk=inCheck(opp),moves=hasMove(opp);
  if(!moves){if(chk){const winner=opp==="white"?"black":"white";document.getElementById("status").textContent=`🏆 ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ — Checkmate`;render();setTimeout(()=>showResult(winner,"ឆេកម៉េត — មិនអាចដើររួច"),220)}else{document.getElementById("status").textContent="🤝 ប្រកួតស្មើ — Stalemate";render();setTimeout(()=>showResult(null,"Stalemate — គ្មានដំណើរស្របច្បាប់"),220)}return}
  if(afterMoveCounting(p.color,captured))return;
  if(!fromAI&&botEnabled&&turn===botColor)startBotTurn();
}

// ---------------- AI / BOT ----------------
const VALUE={pawn:100,bishop:320,knight:420,rook:650,queen:900,king:20000};
const CENTER=[[0,0,0,0,0,0,0,0],[0,4,6,7,7,6,4,0],[0,6,10,12,12,10,6,0],[0,7,12,15,15,12,7,0],[0,7,12,15,15,12,7,0],[0,6,10,12,12,10,6,0],[0,4,6,7,7,6,4,0],[0,0,0,0,0,0,0,0]];
function snapshot(){return {b:clone(),turn,capturedAny}}
function restore(s){board=s.b;turn=s.turn;capturedAny=s.capturedAny}
function applyTemp(m){const p=board[m.r][m.c],capt=board[m.rr][m.cc];board[m.rr][m.cc]=p;board[m.r][m.c]=null;const old={moved:p.moved,capturedAny};p.moved=true;if(capt)capturedAny=true;const promoted=promoteIfNeeded(m.rr,m.cc,p);return {p,capt,old,promoted}}
function undoTemp(m,u){const p=board[m.rr][m.cc];if(u.promoted)p.type="pawn";p.moved=u.old.moved;board[m.r][m.c]=p;board[m.rr][m.cc]=u.capt;capturedAny=u.old.capturedAny}
function material(color){let s=0;for(const row of board)for(const p of row)if(p)s+=(p.color===color?1:-1)*VALUE[p.type];return s}
function evaluate(forColor){let score=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!p)continue;let v=VALUE[p.type];let pos=CENTER[r][c];if(p.type==="pawn"){const advance=p.color==="white"?(7-r):r;pos+=advance*5}if(p.type==="king"&&inCheck(p.color))v-=80;score+=(p.color===forColor?1:-1)*(v+pos)}
  const own=allLegal(forColor).length,opp=allLegal(forColor==="white"?"black":"white").length;score+=(own-opp)*2;
  return score;
}
function terminalScore(color,depth){const moves=hasMove(color);if(moves)return null;const checked=inCheck(color);if(!checked)return 0;return color===botColor?-100000-depth:100000+depth}
function orderedMoves(color){const ms=allLegal(color);ms.forEach(m=>{const t=board[m.rr][m.cc];m.order=(t?VALUE[t.type]*10:0)+((m.rr===2||m.rr===5)&&board[m.r][m.c]?.type==="pawn"?500:0)+(CENTER[m.rr][m.cc]||0)});return ms.sort((a,b)=>b.order-a.order)}
function minimax(depth,alpha,beta,maximizing){
  const color=maximizing?botColor:(botColor==="white"?"black":"white");
  const terminal=terminalScore(color,depth);if(terminal!==null)return terminal;
  if(depth<=0)return evaluate(botColor);
  const moves=orderedMoves(color);
  if(maximizing){let best=-Infinity;for(const m of moves){const u=applyTemp(m);const v=minimax(depth-1,alpha,beta,false);undoTemp(m,u);if(v>best)best=v;if(best>alpha)alpha=best;if(alpha>=beta)break}return best}
  let best=Infinity;for(const m of moves){const u=applyTemp(m);const v=minimax(depth-1,alpha,beta,true);undoTemp(m,u);if(v<best)best=v;if(best<beta)beta=best;if(alpha>=beta)break}return best;
}
function chooseBotMove(){
  const moves=orderedMoves(botColor);if(!moves.length)return null;
  // Depth 3 gives strong tactical play while staying responsive on a phone.
  // If the position is tactical, search one extra ply at a reduced candidate set.
  const candidates=moves.slice(0,24);let best=null,bestScore=-Infinity;
  for(const m of candidates){const u=applyTemp(m);let score=minimax(2,-Infinity,Infinity,false);undoTemp(m,u);score+=(Math.random()*0.06);if(score>bestScore){bestScore=score;best=m}}
  return best;
}
function startBotTurn(){if(gameOver||!botEnabled||turn!==botColor)return;botThinking=true;render();if(aiTimer)clearTimeout(aiTimer);aiTimer=setTimeout(()=>{aiTimer=null;if(gameOver||turn!==botColor)return;const m=chooseBotMove();if(m)move(m.r,m.c,m.rr,m.cc,true);else{botThinking=false;render()}},420)}
function toggleBot(){if(gameOver)return;botEnabled=!botEnabled;botThinking=false;if(aiTimer){clearTimeout(aiTimer);aiTimer=null}render();if(botEnabled&&turn===botColor)startBotTurn()}

function fmt(s){s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function updateClock(){document.getElementById("whiteClock").textContent=fmt(clocks.white);document.getElementById("blackClock").textContent=fmt(clocks.black)}
function stopTimer(){clearInterval(timer);timer=null}
function startTimer(){stopTimer();timer=setInterval(()=>{if(gameOver)return;clocks[turn]--;updateClock();if(clocks[turn]<=0){clocks[turn]=0;const winner=turn==="white"?"black":"white";document.getElementById("status").textContent=`⏱️ ${turn==="white"?"ភាគីស":"ភាគីខ្មៅ"}អស់ពេល — ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ`;showResult(winner,"អស់ពេល")}},1000)}
function reset(){document.getElementById("resultOverlay")?.classList.remove("show");stopTimer();if(aiTimer){clearTimeout(aiTimer);aiTimer=null}initial();turn="white";selected=null;gameOver=false;drag=null;capturedAny=false;moveCount=0;botThinking=false;clocks={white:1800,black:1800};resetCounting();updateKingJumpRights();render();startTimer()}

document.getElementById("countStopBtn").onclick=toggleCountingPause;document.getElementById("countDrawBtn").onclick=declareCountingDraw;document.getElementById("resetBtn").onclick=reset;document.getElementById("newGameBtn").onclick=reset;document.getElementById("playAgainBtn").onclick=reset;document.getElementById("botBtn").onclick=toggleBot;document.getElementById("helpBtn").onclick=()=>document.getElementById("helpModal").classList.add("show");document.getElementById("closeHelp").onclick=()=>document.getElementById("helpModal").classList.remove("show");document.getElementById("helpModal").onclick=e=>{if(e.target.id==="helpModal")e.currentTarget.classList.remove("show")};reset();
