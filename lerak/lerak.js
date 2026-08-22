let board=[],turn="white",selected=null,legal=[],gameOver=false;
let whiteMs=180000,blackMs=180000,lastTick=0,timerHandle=null,botTimer=null;
const INC=2000,WAIT=30000,$=id=>document.getElementById(id);

function newGame(){
 clearInterval(timerHandle);clearTimeout(botTimer);
 board=LerakRules.initial();turn="white";selected=null;legal=[];gameOver=false;
 whiteMs=180000;blackMs=180000;lastTick=performance.now();
 render();startClock();startBotWait();
}
function fmt(ms){let s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60),q=s%60;return `${String(m).padStart(2,"0")}:${String(q).padStart(2,"0")}`}
function updateClock(){
 $("clockWhite").querySelector("strong").textContent=fmt(whiteMs);
 $("clockBlack").querySelector("strong").textContent=fmt(blackMs);
 $("clockWhite").classList.toggle("active",turn==="white");
 $("clockBlack").classList.toggle("active",turn==="black");
 $("clockWhite").classList.toggle("danger",whiteMs<=30000);
 $("clockBlack").classList.toggle("danger",blackMs<=30000);
}
function startClock(){
 clearInterval(timerHandle);lastTick=performance.now();
 timerHandle=setInterval(()=>{
   if(gameOver)return;
   const now=performance.now(),dt=now-lastTick;lastTick=now;
   if(turn==="white")whiteMs=Math.max(0,whiteMs-dt);else blackMs=Math.max(0,blackMs-dt);
   updateClock();
   if(whiteMs<=0||blackMs<=0){
     finish(turn==="white"?"black":"white","⏱️ ពេលវេលាអស់");
   }
 },100);
}
function startBotWait(){
 clearTimeout(botTimer);
 botTimer=setTimeout(()=>{
   if(!gameOver&&turn==="black"){
     $("status").textContent="រកមិនឃើញគូប្រកួតក្នុង 30 វិនាទី — Bot ចូលជំនួស 🤖";
     $("hint").textContent="Bot កំពុងគិត…";
     setTimeout(botMove,650);
   }
 },WAIT);
}
function botMove(){
 if(gameOver||turn!=="black")return;
 const m=LerakBot.choose(board,"black");
 if(!m){finish("white","ខ្មៅគ្មានចលនា");return}
 board=LerakRules.apply(board,m);
 blackMs+=INC;
 turn="white";selected=null;legal=[];
 lastTick=performance.now();render();afterMove();
}
function moveText(m){
 if(m.rek)return "រែកបានកូន ២";
 if(m.trap)return "ហ៊ុំព័ទ្ធ និងចាប់កូន";
 if(m.captures.length)return `ចាប់បាន ${m.captures.length}`;
 return "អាចដើរ";
}
function render(){
 const el=$("board");el.innerHTML="";
 const selectedMoves=selected?LerakRules.legalDestinations(board,turn,selected):[];
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
   const cell=document.createElement("button");
   cell.className="cell "+((r+c)%2?"wood-dark":"wood-light");
   cell.type="button";
   if(selected&&selected[0]===r&&selected[1]===c)cell.classList.add("selected");
   const mv=selectedMoves.find(m=>m.to[0]===r&&m.to[1]===c);
   if(mv){
     cell.classList.add(mv.rek?"rek-target":mv.trap?"trap-target":"move-target");
     cell.title=moveText(mv);
   }
   const p=board[r][c];
   if(p){
     const piece=document.createElement("div");
     piece.className=`piece ${p.color}${p.king?" king":""}`;
     piece.innerHTML=p.king?"♛":"";
     cell.appendChild(piece);
   }
   cell.onclick=()=>clickCell(r,c);
   el.appendChild(cell);
 }
 legal=LerakRules.moves(board,turn);
 if(gameOver){
   $("status").textContent=$("status").dataset.final||"ការប្រកួតបានបញ្ចប់";
   $("hint").textContent="ចុច «លេងថ្មី» ដើម្បីចាប់ផ្តើមម្តងទៀត";
 }else{
   $("status").textContent=turn==="white"?"វេនរបស់អ្នក":"វេន Bot 🤖";
   $("hint").textContent=legal.some(m=>m.captures.length)
      ?"មានការរែក/ហ៊ុំព័ទ្ធ — ជ្រើសចលនាដែលបង្ហាញសញ្ញា":"ជ្រើសកូនមួយ ដើម្បីមើលកន្លែងអាចដើរ";
 }
 updateClock();
}
function clickCell(r,c){
 if(gameOver||turn!=="white")return;
 const p=board[r][c];
 if(selected){
   const ms=LerakRules.legalDestinations(board,"white",selected);
   const chosen=ms.find(m=>m.to[0]===r&&m.to[1]===c);
   if(chosen){
     board=LerakRules.apply(board,chosen);
     whiteMs+=INC;turn="black";selected=null;legal=[];lastTick=performance.now();
     render();afterMove();return;
   }
 }
 if(p?.color==="white"){
   const ms=LerakRules.legalDestinations(board,"white",[r,c]);
   selected=ms.length?[r,c]:null;
   render();
 }else{
   selected=null;render();
 }
}
function afterMove(){
 if(!LerakRules.kingAlive(board,"white")){finish("black","ស្តេចសត្រូវបានចាប់");return}
 if(!LerakRules.kingAlive(board,"black")){finish("white","ស្តេចខ្មៅត្រូវបានចាប់");return}
 const next=LerakRules.moves(board,turn);
 if(!next.length){finish(turn==="white"?"black":"white","គូប្រកួតគ្មានចលនាត្រឹមត្រូវ");return}
 if(turn==="black")startBotWait();else clearTimeout(botTimer);
}
function finish(winner,reason){
 gameOver=true;clearInterval(timerHandle);clearTimeout(botTimer);selected=null;
 $("status").dataset.final=`🏆 ${winner==="white"?"អ្នក":"Bot"} ឈ្នះ — ${reason}`;
 render();
}
function showRules(){
 $("modalContent").innerHTML=`
 <h2>📖 ច្បាប់ល្បែងរែក</h2>
 <p><b>ក្តារ:</b> 8×8 មិនប្រើតែពណ៌ងងឹតដូច Checkers ទេ។ កូនរែកអាចឈរលើគ្រប់ក្រឡា។</p>
 <p><b>កូន:</b> មួយភាគីមាន 16 — ស្តេច 1 និងកូនធម្មតា 15។</p>
 <p><b>ការរៀប:</b> កូនធម្មតា 7 នៅជួរខាងក្រៅ និង 8 នៅជួរទី 3; ស្តេចនៅជួរទី 2 តាមការរៀបបែបរែក។</p>
 <p><b>ការដើរ:</b> កូនទាំងអស់ រួមទាំងស្តេច ដើរត្រង់ផ្ដេក/បញ្ឈរ ដូច Rook និងអាចទៅបានច្រើនក្រឡា ប្រសិនបើផ្លូវទំនេរ។</p>
 <p><b>រែក (Intervention):</b> ដាក់កូនរបស់ខ្លួនចូលក្រឡាទំនេរដែលនៅចន្លោះកូនសត្រូវ 2 ដែលនៅជាប់គ្នាតាមជួរដេក ឬជួរឈរ → កូនសត្រូវទាំង 2 ត្រូវបានចាប់។</p>
 <p><b>ហ៊ុំព័ទ្ធ (Custodian):</b> បន្ទាប់ពីដើរ ប្រសិនបើកូនសត្រូវ ឬក្រុមកូនសត្រូវត្រូវបានហ៊ុំព័ទ្ធ/ជាប់រហូតគ្មានចលនាត្រង់ស្របច្បាប់ទៀត → ត្រូវបានចាប់។</p>
 <p><b>ឈ្នះ:</b> គោលដៅគឺចាប់ <b>ស្តេច</b> របស់គូប្រកួត។</p>
 <p><b>ពេល:</b> 3:00 + 2 វិនាទីក្នុងមួយចលនា។ បើគ្មានមនុស្សជាគូប្រកួត បន្ទាប់ពី 30 វិនាទី Bot ចូលជំនួស។</p>
 <p class="note">ច្បាប់រែកខាងលើត្រូវបានរៀបតាមឯកសារពិពណ៌នាអំពី Rek ដែលរកឃើញ និងបំបែកពី Checkers ដោយចេតនា។</p>`;
 $("modal").classList.add("show");
}
function closeModal(){$("modal").classList.remove("show")}
document.addEventListener("DOMContentLoaded",newGame);
