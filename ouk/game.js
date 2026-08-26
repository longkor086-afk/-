const TYPES={rook:"ទូក",knight:"សេះ",bishop:"គោល",queen:"នាង",king:"ស្តេច",pawn:"ត្រី"};
const IMG={white:{rook:"assets/white_rook.png",knight:"assets/white_knight.png",bishop:"assets/white_bishop.png",queen:"assets/white_queen.png",king:"assets/white_king.png",pawn:"assets/white_pawn.png"},black:{rook:"assets/black_rook.png",knight:"assets/black_knight.png",bishop:"assets/black_bishop.png",queen:"assets/black_queen.png",king:"assets/black_king.png",pawn:"assets/black_pawn.png"}};
let board=[],turn="white",selected=null,gameOver=false,timer=null,drag=null,capturedAny=false;
let clocks={white:1800,black:1800};

// Ouk Chatrang starting position: King is left of Neang (Queen), pawns/fish on ranks 3 and 6.
const BACK=["rook","knight","bishop","king","queen","bishop","knight","rook"];
function initial(){
  board=Array.from({length:8},()=>Array(8).fill(null));
  for(let c=0;c<8;c++){
    board[0][c]={color:"black",type:BACK[c],moved:false};
    board[2][c]={color:"black",type:"pawn",moved:false};
    board[5][c]={color:"white",type:"pawn",moved:false};
    board[7][c]={color:"white",type:BACK[c],moved:false};
  }
}
function inb(r,c){return r>=0&&r<8&&c>=0&&c<8}
function rayMoves(r,c,dirs,color){const out=[];for(const[dr,dc]of dirs){let rr=r+dr,cc=c+dc;while(inb(rr,cc)){if(!board[rr][cc])out.push([rr,cc]);else{if(board[rr][cc].color!==color&&board[rr][cc].type!=="king")out.push([rr,cc]);break}rr+=dr;cc+=dc}}return out}
function add(out,r,c,p){if(inb(r,c)&&(!board[r][c]||(board[r][c].color!==p.color&&board[r][c].type!=="king")))out.push([r,c])}

function pseudo(r,c,attacks=false){
  const p=board[r][c];if(!p)return[];const out=[];
  const forward=p.color==="white"?-1:1;
  if(p.type==="king"){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(out,r+dr,c+dc,p);
    // Cambodian opening king jump: only on its first move, no capture has happened, and not in check.
    if(!attacks&&!p.moved&&!capturedAny&&!inCheck(p.color)){
      for(const dc of [-2,2])add(out,r+forward,c+dc,p);
    }
  }
  if(p.type==="queen"){
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
    // Cambodian opening Neang jump: two squares straight forward, non-capturing.
    if(!attacks&&!p.moved&&!capturedAny&&inb(r+forward*2,c)&&!board[r+forward][c]&&!board[r+forward*2][c])out.push([r+forward*2,c]);
  }
  if(p.type==="bishop"){
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
    add(out,r+forward,c,p);
  }
  if(p.type==="knight")[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>add(out,r+dr,c+dc,p));
  if(p.type==="rook")return rayMoves(r,c,[[1,0],[-1,0],[0,1],[0,-1]],p.color);
  if(p.type==="pawn"){
    if(!attacks&&inb(r+forward,c)&&!board[r+forward][c])out.push([r+forward,c]);
    for(const dc of[-1,1])if(inb(r+forward,c+dc)){
      if(attacks){out.push([r+forward,c+dc]);}
      else if(board[r+forward][c+dc]&&board[r+forward][c+dc].color!==p.color&&board[r+forward][c+dc].type!=="king")out.push([r+forward,c+dc]);
    }
  }
  return out;
}
function clone(){return board.map(row=>row.map(p=>p?{...p}:null))}
function attacked(r,c,by){
  for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
    const p=board[rr][cc];if(!p||p.color!==by)continue;
    if(pseudo(rr,cc,true).some(([a,b])=>a===r&&b===c))return true;
  }
  return false;
}
function inCheck(color){let k=null;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&board[r][c]?.type==="king")k=[r,c];return k?attacked(k[0],k[1],color==="white"?"black":"white"):true}
function legal(r,c){
  const p=board[r][c];if(!p)return[];
  return pseudo(r,c).filter(([rr,cc])=>{
    const target=board[rr][cc];if(target?.type==="king")return false;
    const save=clone();board[rr][cc]=p;board[r][c]=null;
    const ok=!inCheck(p.color);board=save;return ok;
  });
}
function hasMove(color){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&legal(r,c).length)return true;return false}
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
    if(p){
      const img=document.createElement("img");img.className="piece"+(selected&&selected[0]===r&&selected[1]===c?" selected-piece":"");img.src=IMG[p.color][p.type];img.alt=TYPES[p.type];img.draggable=false;img.dataset.r=r;img.dataset.c=c;
      img.addEventListener("pointerdown",e=>startDrag(e,r,c));img.addEventListener("click",e=>{e.stopPropagation();clickCell(r,c)});cell.appendChild(img);
    }
    el.appendChild(cell);
  }
  document.getElementById("turnLabel").textContent=gameOver?"ការប្រកួតបញ្ចប់":"វេន "+(turn==="white"?"ភាគីស":"ភាគីខ្មៅ");
  document.getElementById("status").textContent=gameOver?document.getElementById("status").textContent:(inCheck(turn)?`⚠️ ភាគី${turn==="white"?"ស":"ខ្មៅ"} កំពុងជាប់អុក`:"ចុច/អូសកូនអុក → ក្រឡាដែលចង់ដើរ");
  markTargets();updateClock();
}
function clickCell(r,c){
  if(gameOver||drag)return;const p=board[r][c];
  if(selected){const ok=legal(...selected).some(x=>x[0]===r&&x[1]===c);if(ok){move(...selected,r,c);return}if(p&&p.color===turn){selected=[r,c];render();return}selected=null;render();return}
  if(p&&p.color===turn){selected=[r,c];render()}
}
function startDrag(e,r,c){
  if(gameOver||!board[r][c]||board[r][c].color!==turn)return;e.preventDefault();selected=[r,c];render();
  const img=document.querySelector(`.cell[data-r="${r}"][data-c="${c}"] .piece`);if(!img)return;
  const rect=img.getBoundingClientRect(),ghost=img.cloneNode(true);ghost.className="drag-ghost";ghost.style.setProperty("--piece-size",Math.min(rect.width,rect.height)+"px");ghost.style.left=e.clientX+"px";ghost.style.top=e.clientY+"px";document.body.appendChild(ghost);img.style.visibility="hidden";
  drag={r,c,img,ghost};markTargets();document.addEventListener("pointermove",dragMove,{passive:false});document.addEventListener("pointerup",dragEnd,{once:true});
}
function dragMove(e){if(!drag)return;e.preventDefault();drag.ghost.style.left=e.clientX+"px";drag.ghost.style.top=e.clientY+"px";const target=cellAtPoint(e.clientX,e.clientY);clearDropTargets();if(target&&legal(drag.r,drag.c).some(x=>x[0]===target[0]&&x[1]===target[1]))document.querySelector(`.cell[data-r="${target[0]}"][data-c="${target[1]}"]`)?.classList.add("drop-target")}
function dragEnd(e){if(!drag)return;document.removeEventListener("pointermove",dragMove);const d=drag,target=cellAtPoint(e.clientX,e.clientY);const ok=target&&legal(d.r,d.c).some(x=>x[0]===target[0]&&x[1]===target[1]);d.ghost.remove();d.img.style.visibility="visible";drag=null;clearDropTargets();if(ok)move(d.r,d.c,target[0],target[1]);else{selected=[d.r,d.c];render()}}

function showResult(winner,reason){
  gameOver=true;stopTimer();
  const overlay=document.getElementById("resultOverlay");
  document.getElementById("resultTitle").textContent=winner?"ឈ្នះ!":"ស្មើ!";
  document.getElementById("resultTitle").className=winner?"win":"draw";
  document.getElementById("resultText").textContent=winner?`${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះហើយ!`:reason;
  overlay.classList.add("show");
}
function promoteIfNeeded(r,c,p){
  // User-requested rule: Trey is flipped only when it reaches the final row.
  if(p.type==="pawn"&&((p.color==="white"&&r===0)||(p.color==="black"&&r===7))){p.type="queen";p.promoted=true;return true}return false;
}
function move(r,c,rr,cc){
  const p=board[r][c],captured=board[rr][cc];
  board[rr][cc]=p;board[r][c]=null;p.moved=true;if(captured)capturedAny=true;
  const promoted=promoteIfNeeded(rr,cc,p);turn=turn==="white"?"black":"white";selected=null;
  render();
  const landed=document.querySelector(`.cell[data-r="${rr}"][data-c="${cc}"] .piece`);if(landed){landed.classList.add("move-land");setTimeout(()=>landed.classList.remove("move-land"),360)}
  const opp=turn,chk=inCheck(opp),moves=hasMove(opp);
  if(!moves){
    if(chk){const winner=opp==="white"?"black":"white";document.getElementById("status").textContent=`🏆 ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ — Checkmate`;render();setTimeout(()=>showResult(winner,"ឆេកម៉េត — មិនអាចដើររួច"),220)}
    else{document.getElementById("status").textContent="🤝 ប្រកួតស្មើ — Stalemate";render();setTimeout(()=>showResult(null,"Stalemate — គ្មានដំណើរស្របច្បាប់"),220)}
  } else if(promoted){document.getElementById("status").textContent=`✨ ត្រីរបស់${p.color==="white"?"ភាគីស":"ភាគីខ្មៅ"}បានបកជា នាង`;render()}
}
function fmt(s){s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function updateClock(){document.getElementById("whiteClock").textContent=fmt(clocks.white);document.getElementById("blackClock").textContent=fmt(clocks.black)}
function stopTimer(){clearInterval(timer);timer=null}
function startTimer(){stopTimer();timer=setInterval(()=>{if(gameOver)return;clocks[turn]--;updateClock();if(clocks[turn]<=0){clocks[turn]=0;const winner=turn==="white"?"black":"white";document.getElementById("status").textContent=`⏱️ ${turn==="white"?"ភាគីស":"ភាគីខ្មៅ"}អស់ពេល — ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ`;showResult(winner,"អស់ពេល")}},1000)}
function reset(){document.getElementById("resultOverlay")?.classList.remove("show");stopTimer();initial();turn="white";selected=null;gameOver=false;drag=null;capturedAny=false;clocks={white:1800,black:1800};render();startTimer()}

document.getElementById("resetBtn").onclick=reset;document.getElementById("newGameBtn").onclick=reset;document.getElementById("playAgainBtn").onclick=reset;document.getElementById("helpBtn").onclick=()=>document.getElementById("helpModal").classList.add("show");document.getElementById("closeHelp").onclick=()=>document.getElementById("helpModal").classList.remove("show");document.getElementById("helpModal").onclick=e=>{if(e.target.id==="helpModal")e.currentTarget.classList.remove("show")};reset();
