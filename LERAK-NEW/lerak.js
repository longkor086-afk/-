let board=[],turn="white",selected=null,legal=[],gameOver=false;
let whiteMs=180000,blackMs=180000,lastTick=0,timerHandle=null,botTimer=null,botEnabled=true;
const INC=2000,WAIT=30000;
const $=id=>document.getElementById(id);

function makeBoard(){
  board=Array.from({length:8},()=>Array(8).fill(null));
  for(let r=0;r<3;r++)for(let c=0;c<8;c++)if((r+c)%2===1)board[r][c]={color:"black",king:false};
  for(let r=5;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2===1)board[r][c]={color:"white",king:false};
}
function newGame(){
  clearTimeout(botTimer); makeBoard();turn="white";selected=null;gameOver=false;
  whiteMs=180000;blackMs=180000;lastTick=performance.now();
  render(); startClock(); startBotWait();
}
function startClock(){
  clearInterval(timerHandle);lastTick=performance.now();
  timerHandle=setInterval(()=>{
    if(gameOver)return;
    const now=performance.now(),dt=now-lastTick;lastTick=now;
    if(turn==="white")whiteMs=Math.max(0,whiteMs-dt);else blackMs=Math.max(0,blackMs-dt);
    updateClock();
    if(whiteMs<=0||blackMs<=0)finish(turn==="white"?"black":"white","⏱️ ពេលវេលាអស់");
  },100);
}
function updateClock(){
  const f=ms=>{let s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60),q=s%60;return `${String(m).padStart(2,"0")}:${String(q).padStart(2,"0")}`};
  $("clockWhite").querySelector("strong").textContent=f(whiteMs);
  $("clockBlack").querySelector("strong").textContent=f(blackMs);
  $("clockWhite").classList.toggle("active",turn==="white");
  $("clockBlack").classList.toggle("active",turn==="black");
  $("clockWhite").classList.toggle("danger",whiteMs<=30000);
  $("clockBlack").classList.toggle("danger",blackMs<=30000);
}
function startBotWait(){
  clearTimeout(botTimer);
  botTimer=setTimeout(()=>{
    if(!gameOver&&turn==="black"){
      $("status").textContent="មិនមានគូប្រកួត — Bot ចូលលេងជំនួស 🤖";
      setTimeout(botMove,500);
    }
  },WAIT);
}
function botMove(){
  if(gameOver||turn!=="black")return;
  const mv=LerakBot.choose(board,"black");
  if(!mv){finish("white","ឈ្នះ");return}
  board=LerakRules.apply(board,mv);turn="white";selected=null;legal=[];lastTick=performance.now();
  render();afterMove();
}
function render(){
  const b=$("board");b.innerHTML="";
  const moves=selected?legal.filter(m=>m.from[0]===selected[0]&&m.from[1]===selected[1]):[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cell=document.createElement("button");cell.className="cell "+((r+c)%2?"dark":"light");
    cell.type="button";cell.dataset.r=r;cell.dataset.c=c;
    if(selected&&selected[0]===r&&selected[1]===c)cell.classList.add("selected");
    const mv=moves.find(m=>m.to[0]===r&&m.to[1]===c);
    if(mv)cell.classList.add(mv.over?"capture":"move");
    const p=board[r][c];
    if(p){const piece=document.createElement("div");piece.className=`piece ${p.color}${p.king?" king":""}`;cell.appendChild(piece)}
    cell.onclick=()=>clickCell(r,c);b.appendChild(cell);
  }
  legal=LerakRules.moves(board,turn);
  $("status").textContent=gameOver?"ការប្រកួតបានបញ្ចប់":(turn==="white"?"វេនរបស់អ្នក":"វេន Bot 🤖");
  updateClock();
}
function clickCell(r,c){
  if(gameOver||turn!=="white")return;
  const p=board[r][c], moves=LerakRules.moves(board,"white");
  const destinations=selected?moves.filter(m=>m.from[0]===selected[0]&&m.from[1]===selected[1]):[];
  const chosen=destinations.find(m=>m.to[0]===r&&m.to[1]===c);
  if(chosen){
    board=LerakRules.apply(board,chosen);selected=null;legal=[];whiteMs+=INC;turn="black";lastTick=performance.now();render();afterMove();return;
  }
  if(p&&p.color==="white"){
    const can=moves.some(m=>m.from[0]===r&&m.from[1]===c);
    selected=can?[r,c]:null;legal=moves;render();
  }else{selected=null;render()}
}
function afterMove(){
  if(!LerakRules.hasAny(board,turn)){finish(turn==="white"?"black":"white","មិនអាចចលនា");return}
  if(turn==="black")startBotWait();
  else clearTimeout(botTimer);
}
function finish(winner,reason){
  gameOver=true;clearInterval(timerHandle);clearTimeout(botTimer);selected=null;
  $("status").textContent=`🏆 ${winner==="white"?"អ្នក":"Bot"} ឈ្នះ — ${reason}`;
  render();
}
function showRules(){
  $("modalContent").innerHTML=`<h2>📖 ច្បាប់រែក</h2>
  <p>• ក្តារ 8×8 និងកូនឈើស/ខ្មៅ 3D<br>
  • ភាគីសចាប់ផ្តើម<br>• ត្រូវចាប់កូន ប្រសិនបើមានការចាប់<br>
  • អាចចាប់បន្តជាច្រើនដង<br>• ឡើងដល់ចុងក្តារ → ក្លាយជា King<br>
  • ពេលលេង 3:00 + 2 វិនាទីក្នុងមួយចលនា<br>• រង់ចាំ 30 វិនាទីសម្រាប់គូប្រកួត; បើគ្មាន Bot ចូលជំនួស</p>`;
  $("modal").classList.add("show");
}
function closeModal(){$("modal").classList.remove("show")}
document.addEventListener("DOMContentLoaded",newGame);
