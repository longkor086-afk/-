const TYPES={rook:"ទូក",knight:"សេះ",bishop:"គូល",queen:"នាង",king:"ស្តេច",pawn:"ត្រី"};
const IMG={
 white:{rook:"assets/white_rook.png",knight:"assets/white_knight.png",bishop:"assets/white_bishop.png",queen:"assets/white_queen.png",king:"assets/white_king.png",pawn:"assets/white_pawn.png"},
 black:{rook:"assets/black_rook.png",knight:"assets/black_knight.png",bishop:"assets/black_bishop.png",queen:"assets/black_queen.png",king:"assets/black_king.png",pawn:"assets/black_pawn.png"}
};
let board=[],turn="white",selected=null,gameOver=false;
let clocks={white:1800,black:1800},timer=null;

function initial(){
 board=Array.from({length:8},()=>Array(8).fill(null));
 const back=["rook","knight","bishop","queen","king","bishop","knight","rook"];
 for(let c=0;c<8;c++){board[0][c]={color:"black",type:back[c],moved:false};board[1][c]={color:"black",type:"pawn",moved:false};
 board[6][c]={color:"white",type:"pawn",moved:false};board[7][c]={color:"white",type:back[c],moved:false};}
}
function inb(r,c){return r>=0&&r<8&&c>=0&&c<8}
function rayMoves(r,c,dirs,color){
 const out=[];for(const [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(inb(rr,cc)){if(!board[rr][cc])out.push([rr,cc]);else{if(board[rr][cc].color!==color)out.push([rr,cc]);break}rr+=dr;cc+=dc}}return out
}
function pseudo(r,c){
 const p=board[r][c];if(!p)return [];
 const out=[];const add=(rr,cc)=>{if(inb(rr,cc)&&(!board[rr][cc]||board[rr][cc].color!==p.color))out.push([rr,cc])};
 if(p.type==="king"){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(r+dr,c+dc)}
 if(p.type==="queen")[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(r+dr,c+dc));
 if(p.type==="bishop"){[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc])=>add(r+dr,c+dc));add(r+(p.color==="white"?-1:1),c)}
 if(p.type==="knight")[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>add(r+dr,c+dc));
 if(p.type==="rook")return rayMoves(r,c,[[1,0],[-1,0],[0,1],[0,-1]],p.color);
 if(p.type==="pawn"){const d=p.color==="white"?-1:1; if(inb(r+d,c)&&!board[r+d][c])out.push([r+d,c]);for(const dc of [-1,1]){if(inb(r+d,c+dc)&&board[r+d][c+dc]&&board[r+d][c+dc].color!==p.color)out.push([r+d,c+dc])}}
 return out;
}
function clone(){return board.map(row=>row.map(p=>p?{...p}:null))}
function attacked(r,c,by){
 for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){let p=board[rr][cc];if(!p||p.color!==by)continue;
   if(pseudo(rr,cc).some(([a,b])=>a===r&&b===c))return true;
 }return false;
}
function inCheck(color){
 let k=null;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&board[r][c]?.type==="king")k=[r,c];
 return k?attacked(k[0],k[1],color==="white"?"black":"white"):false;
}
function legal(r,c){
 const p=board[r][c];if(!p)return [];
 return pseudo(r,c).filter(([rr,cc])=>{
   const save=clone();board[rr][cc]=p;board[r][c]=null;
   const ok=!inCheck(p.color);board=save;return ok;
 });
}
function hasMove(color){
 for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.color===color&&legal(r,c).length)return true;return false;
}
function render(){
 const el=document.getElementById("board");el.innerHTML="";
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
   const cell=document.createElement("div");cell.className="cell"+(r===7?" last-row":"");cell.style.left=(c*12.5)+"%";cell.style.top=(r*12.5)+"%";cell.dataset.r=r;cell.dataset.c=c;
   if(selected&&selected[0]===r&&selected[1]===c)cell.classList.add("selected");
   if(selected&&legal(...selected).some(x=>x[0]===r&&x[1]===c))cell.classList.add(board[r][c]?"capture":"legal");
   if(board[r][c]&&board[r][c].type==="king"&&inCheck(board[r][c].color))cell.classList.add("check");
   cell.onclick=()=>clickCell(r,c);
   const p=board[r][c];if(p){const img=document.createElement("img");img.className="piece"+(selected&&selected[0]===r&&selected[1]===c?" selected-piece":"");img.src=IMG[p.color][p.type];img.alt=TYPES[p.type];img.draggable=false;img.onclick=e=>{e.stopPropagation();clickCell(r,c)};cell.appendChild(img)}
   el.appendChild(cell);
 }
 document.getElementById("turnLabel").textContent=gameOver?"ការប្រកួតបញ្ចប់":"វេន "+(turn==="white"?"ភាគីស":"ភាគីខ្មៅ");
 document.getElementById("status").textContent=inCheck(turn)?`⚠️ ភាគី${turn==="white"?"ស":"ខ្មៅ"} កំពុងជាប់អុក`:"ចុចកូនអុក → ចុចក្រឡាដែលចង់ដើរ";
}
function clickCell(r,c){
 if(gameOver)return;
 const p=board[r][c];
 if(selected){
   const moves=legal(...selected),ok=moves.some(x=>x[0]===r&&x[1]===c);
   if(ok){move(selected[0],selected[1],r,c);return}
   if(p&&p.color===turn){selected=[r,c];render();return}
   selected=null;render();return;
 }
 if(p&&p.color===turn){selected=[r,c];render();}
}
function move(r,c,rr,cc){
 const p=board[r][c];board[rr][cc]=p;board[r][c]=null;p.moved=true;
 if(p.type==="pawn"&&((p.color==="white"&&rr===2)||(p.color==="black"&&rr===5)))p.type="queen";
 turn=turn==="white"?"black":"white";selected=null;
 const opp=turn,chk=inCheck(opp),moves=hasMove(opp);
 if(!moves){gameOver=true;document.getElementById("status").textContent=chk?"🏆 Checkmate":"🤝 Stalemate";stopTimer()}
 render();
}
function fmt(s){s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function updateClock(){document.getElementById("whiteClock").textContent=fmt(clocks.white);document.getElementById("blackClock").textContent=fmt(clocks.black)}
function stopTimer(){clearInterval(timer);timer=null}
function startTimer(){stopTimer();timer=setInterval(()=>{if(gameOver)return;clocks[turn]--;updateClock();if(clocks[turn]<=0){clocks[turn]=0;gameOver=true;document.getElementById("status").textContent="⏱️ អស់ពេល";stopTimer();render()}},1000)}
function reset(){initial();turn="white";selected=null;gameOver=false;clocks={white:1800,black:1800};updateClock();render();startTimer()}
document.getElementById("resetBtn").onclick=reset;document.getElementById("newGameBtn").onclick=reset;
document.getElementById("helpBtn").onclick=()=>document.getElementById("helpModal").classList.add("show");
document.getElementById("closeHelp").onclick=()=>document.getElementById("helpModal").classList.remove("show");
document.getElementById("helpModal").onclick=e=>{if(e.target.id==="helpModal")e.currentTarget.classList.remove("show")};
reset();
