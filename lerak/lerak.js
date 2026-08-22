(() => {
"use strict";
const W="white",B="black",DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const MAIN=180000,INC=2000,WAIT=30000;
let mode="surround",board=[],turn=W,phase="opening",selectedOpening=[],selected=null,gameOver=false;
let callTrap=null,pendingCall=null,callArmed=false,humanSide=W,botEnabled=false;
let botTimer=null,clockTimer=null,whiteMs=MAIN,blackMs=MAIN,lastTick=0,lastTurn=null;

const $=id=>document.getElementById(id), inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const other=s=>s===W?B:W, sideName=s=>s===W?"ភាគីស":"ភាគីខ្មៅ";
const kh=n=>String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d]);
function msg(t){$("message").textContent=t}
function count(side){let n=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===side)n++;return n}
function troopCount(side){let n=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++){let p=board[r][c];if(p?.side===side&&!p.king)n++}return n}
function initialBoard(){
 const a=Array.from({length:8},()=>Array(8).fill(null));
 for(let c=1;c<8;c++)a[0][c]={side:B,king:false};
 a[1][0]={side:B,king:true};
 for(let c=0;c<8;c++)a[2][c]={side:B,king:false};
 for(let c=0;c<8;c++)a[5][c]={side:W,king:false};
 a[6][7]={side:W,king:true};
 for(let c=0;c<7;c++)a[7][c]={side:W,king:false};
 return a;
}
function openingFrontRow(side){return side===B?2:5}
function openingDirection(side){return side===B?1:-1}
function validOpeningPair(a,b){
 const[r1,c1]=a,[r2,c2]=b;
 return (r1===r2&&Math.abs(c1-c2)===2)||(c1===c2&&Math.abs(r1-r2)===2);
}
function normalMoves(r,c){
 const p=board[r][c];if(!p)return[];
 if(mode==="normal"&&p.king)return[];
 const out=[];
 for(const[dr,dc]of DIRS){
  let nr=r+dr,nc=c+dc;
  while(inside(nr,nc)){if(board[nr][nc])break;out.push([nr,nc]);nr+=dr;nc+=dc}
 }
 return out;
}
function captureAt(r,c,side){
 const enemy=other(side),pairs=[];
 if(inside(r,c-1)&&inside(r,c+1)&&board[r][c-1]?.side===enemy&&board[r][c+1]?.side===enemy)
   pairs.push([[r,c-1],[r,c+1]]);
 if(inside(r-1,c)&&inside(r+1,c)&&board[r-1][c]?.side===enemy&&board[r+1][c]?.side===enemy)
   pairs.push([[r-1,c],[r+1,c]]);
 return pairs[0]||[];
}
function performCapture(r,c,side){
 const victims=captureAt(r,c,side);let kingCaptured=false;
 for(const[vr,vc]of victims){const p=board[vr][vc];if(!p||p.side===side)continue;if(p.king)kingCaptured=true;board[vr][vc]=null}
 return{victims,kingCaptured}
}
function getGroup(sr,sc){
 const p=board[sr][sc];if(!p)return{cells:[],liberties:[],hasKing:false};
 const side=p.side,cells=[],liberties=[],seen=new Set([`${sr},${sc}`]),q=[[sr,sc]];
 while(q.length){
  const[r,c]=q.shift();cells.push([r,c]);
  for(const[dr,dc]of DIRS){
   const nr=r+dr,nc=c+dc;if(!inside(nr,nc))continue;
   const np=board[nr][nc];
   if(!np){if(!liberties.some(([lr,lc])=>lr===nr&&lc===nc))liberties.push([nr,nc])}
   else if(np.side===side){const k=`${nr},${nc}`;if(!seen.has(k)){seen.add(k);q.push([nr,nc])}}
  }
 }
 return{cells,liberties,hasKing:cells.some(([r,c])=>board[r][c]?.king)}
}
function applySurroundAfterMove(r,c,side){
 const enemy=other(side),checked=new Set(),deadGroups=[];
 for(const[dr,dc]of DIRS){
  const nr=r+dr,nc=c+dc;if(!inside(nr,nc))continue;
  const np=board[nr][nc];if(!np||np.side!==enemy)continue;
  const key=`${nr},${nc}`;if(checked.has(key))continue;
  const group=getGroup(nr,nc);group.cells.forEach(([gr,gc])=>checked.add(`${gr},${gc}`));
  if(group.liberties.length===0)deadGroups.push(group);
 }
 let removed=0,kingCaptured=false;
 for(const g of deadGroups){
  if(g.hasKing)kingCaptured=true;
  for(const[gr,gc]of g.cells)if(board[gr][gc]){board[gr][gc]=null;removed++}
 }
 return{removed,kingCaptured,deadGroups}
}
function getCallCaptureMoves(targetR,targetC,enemySide){
 const moves=[],target=board[targetR][targetC];
 if(!target||target.side===enemySide||target.king)return moves;
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const p=board[r][c];if(!p||p.side!==enemySide)continue;
  for(const[tr,tc]of normalMoves(r,c)){
   board[tr][tc]=p;board[r][c]=null;
   const cap=captureAt(tr,tc,enemySide);
   const hits=cap.some(([vr,vc])=>vr===targetR&&vc===targetC);
   board[r][c]=p;board[tr][tc]=null;
   if(hits)moves.push({from:[r,c],to:[tr,tc]});
  }
 }
 return moves;
}
function executeMove(sr,sc,tr,tc){
 const moved=board[sr][sc];if(!moved)return false;
 board[tr][tc]=moved;board[sr][sc]=null;
 const cap=performCapture(tr,tc,moved.side);
 if(cap.kingCaptured){gameOver=true;msg(`${sideName(moved.side)} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានរែក។`);render();return true}
 if(mode==="normal"&&troopCount(other(moved.side))===0){gameOver=true;msg(`${sideName(moved.side)} ឈ្នះ! កងទ័ពគូប្រកួតស្លាប់អស់។`);render();return true}
 const surround=mode==="surround"?applySurroundAfterMove(tr,tc,moved.side):{removed:0,kingCaptured:false};
 if(surround.kingCaptured){gameOver=true;msg(`${sideName(moved.side)} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានព័ទ្ធ។`);render();return true}
 if(mode==="normal"&&troopCount(other(moved.side))===0){gameOver=true;msg(`${sideName(moved.side)} ឈ្នះ!`);render();return true}
 if(callArmed&&!moved.king){pendingCall={side:moved.side,r:tr,c:tc};callArmed=false;startCallFromPending();return true}
 pendingCall=null;callArmed=false;
 const old=turn;turn=other(turn);addIncrement(old);lastTurn=turn;
 let text="ដើរធម្មតារួច។";
 if(cap.victims.length===2&&surround.removed>0)text=`រែកបាន ២ កូន និងព័ទ្ធបាន ${kh(surround.removed)} កូន។`;
 else if(cap.victims.length===2)text="រែកបាន ២ កូន។";
 else if(surround.removed>0)text=`ព័ទ្ធបាន ${kh(surround.removed)} កូន។`;
 msg(`${text} វេន ${sideName(turn)}។`);render();maybeBot();return true;
}
function openingClick(r,c){
 const p=board[r][c],front=openingFrontRow(turn);
 if(!p||p.side!==turn){msg("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន។");return}
 if(r!==front||p.king){msg("ដំណាក់កាលដំបូង ត្រូវជ្រើសកូនទ័ពនៅជួរមុខ។");return}
 if(selectedOpening.length===0){selectedOpening=[[r,c]];msg("បានជ្រើសកូនទី១។ ជ្រើសកូនទី២ដែលរំលង ១ ក្រឡា។");render();return}
 if(selectedOpening[0][0]===r&&selectedOpening[0][1]===c){selectedOpening=[];msg("បានលុបការជ្រើស។");render();return}
 const pair=[selectedOpening[0],[r,c]];
 if(!validOpeningPair(...pair)){msg("កូនទាំង ២ ត្រូវរំលងគ្នា ១ ក្រឡា។");return}
 selectedOpening=pair;msg("បានជ្រើសកូន ២។ ចុច «បញ្ជាក់ចេញកូន ២»។");render();
}
function confirmOpening(){
 if(selectedOpening.length!==2)return;
 const front=openingFrontRow(turn),dir=openingDirection(turn);
 for(const[r,c]of selectedOpening)if(r!==front||!board[r][c]||board[r][c].side!==turn||board[r][c].king){msg("ការចេញដំបូងត្រូវជ្រើសកូនទ័ព ២ នៅជួរមុខ។");return}
 const dest=selectedOpening.map(([r,c])=>[r+dir,c]);
 if(dest.some(([r,c])=>!inside(r,c)||board[r][c])){msg("ក្រឡាខាងមុខមិនទំនេរ។");return}
 const pieces=selectedOpening.map(([r,c])=>board[r][c]);selectedOpening.forEach(([r,c])=>board[r][c]=null);
 dest.forEach(([r,c],i)=>{board[r][c]=pieces[i];board[r][c].opened=true});
 selectedOpening=[];
 if(!board.openingDone){board.openingDone=true;const old=turn;turn=other(turn);addIncrement(old);lastTurn=turn;msg(`ភាគីទីមួយបានចេញកូន ២។ ឥឡូវ ${sideName(turn)} ចេញកូន ២។`)}
 else{phase="normal";const old=turn;turn=other(turn);addIncrement(old);lastTurn=turn;msg(`ការចេញដំបូងរួចរាល់។ ឥឡូវលេងធម្មតា — វេន ${sideName(turn)}។`)}
 render();maybeBot();
}
function startCallFromPending(){
 if(!pendingCall)return;
 const{r,c,side}=pendingCall,p=board[r][c];
 if(!p||p.side!==side||p.king){pendingCall=null;turn=other(side);render();return}
 const captures=getCallCaptureMoves(r,c,other(side));
 if(!captures.length){pendingCall=null;const old=turn;turn=other(side);addIncrement(old);lastTurn=turn;msg("គ្មានចលនារែកគោលដៅនេះទេ។ គូប្រកួតបានវេនធម្មតា។");render();maybeBot();return}
 callTrap={side,r,c,captureMoves:captures};pendingCall=null;const old=turn;turn=other(side);addIncrement(old);lastTurn=turn;
 msg(`🪤 ហៅរែក! ${sideName(turn)} ជ្រើសចលនាដែលអាចមករែកកូនគោលដៅ។`);render();maybeBot();
}
function executeCallCapture(move){
 const[fr,fc]=move.from,[tr,tc]=move.to,p=board[fr][fc];if(!p)return;
 board[tr][tc]=p;board[fr][fc]=null;const cap=performCapture(tr,tc,p.side);callTrap=null;selected=null;
 if(cap.kingCaptured){gameOver=true;msg(`${sideName(p.side)} ឈ្នះ! ស្តេចត្រូវបានរែក។`)}
 else{const old=turn;turn=other(turn);addIncrement(old);lastTurn=turn;msg(`បានឆ្លើយតបការហៅរែក។ រែកបាន ${kh(cap.victims.length)} កូន។ វេន ${sideName(turn)}។`)}
 render();maybeBot();
}
function clickNormal(r,c){
 if(gameOver)return;
 if(callTrap){
  const chosen=callTrap.captureMoves.find(m=>m.to[0]===r&&m.to[1]===c);
  if(chosen){executeCallCapture(chosen);return}
  msg("ត្រូវជ្រើសចលនាដែលបានបង្ហាញសម្រាប់ការហៅរែក។");return
 }
 const p=board[r][c];
 if(selected){
  const[sr,sc]=selected,legal=normalMoves(sr,sc).some(([a,b])=>a===r&&b===c);
  if(legal){executeMove(sr,sc,r,c);return}
  selected=null
 }
 if(p&&p.side===turn){
  selected=[r,c];
  if(p.king&&mode==="normal")msg("ស្តេចមិនអាចដើរនៅរែកធម្មតា។");
  else msg(p.king?"បានជ្រើសស្តេច។ ជ្រើសក្រឡាដើម្បីដើរ។":"បានជ្រើសកូនទ័ព។ ជ្រើសក្រឡាដើម្បីដើរ។")
 }else msg("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន។");
 render();
}
function clickCell(r,c){if(gameOver)return;phase==="opening"?openingClick(r,c):clickNormal(r,c)}
function tryCallTrap(){
 if(gameOver||phase!=="normal"||callTrap||pendingCall)return;
 callArmed=!callArmed;selected=null;msg(callArmed?"🪤 បានបើក «ហៅរែក»។ ឥឡូវដើរកូនទ័ពគោលដៅ។":"បានបិទ «ហៅរែក»។");render();
}
function legalMoveList(side){
 const out=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(!p||p.side!==side)continue;for(const[tr,tc]of normalMoves(r,c))out.push({from:[r,c],to:[tr,tc]})}return out
}
function botOpening(){
 const front=openingFrontRow(turn),choices=[];for(let c=0;c<8;c++)if(board[front][c]?.side===turn&&!board[front][c]?.king)choices.push([front,c]);
 for(const a of choices)for(const b of choices)if(validOpeningPair(a,b))return[a,b];return null
}
function botTakeTurn(){
 if(!botEnabled||gameOver||turn===humanSide)return;
 if(callTrap&&turn===other(callTrap.side)){const m=callTrap.captureMoves[Math.floor(Math.random()*callTrap.captureMoves.length)];setTimeout(()=>executeCallCapture(m),500);return}
 if(phase==="opening"){const pair=botOpening();if(!pair){msg("🤖 Bot រកការចេញដំបូងមិនឃើញ។");return}selectedOpening=pair;render();setTimeout(confirmOpening,550);return}
 let moves=legalMoveList(turn);if(!moves.length){gameOver=true;msg(`${sideName(humanSide)} ឈ្នះ! Bot មិនមានចលនា។`);render();return}
 let best=moves.filter(m=>{const p=board[m.from[0]][m.from[1]];board[m.to[0]][m.to[1]]=p;board[m.from[0]][m.from[1]]=null;const cap=captureAt(m.to[0],m.to[1],turn).length;board[m.from[0]][m.from[1]]=p;board[m.to[0]][m.to[1]]=null;return cap>0});
 if(!best.length)best=moves;
 const move=best[Math.floor(Math.random()*best.length)];setTimeout(()=>executeMove(move.from[0],move.from[1],move.to[0],move.to[1]),500);
}
function maybeBot(){if(botEnabled&&turn!==humanSide)setTimeout(botTakeTurn,300)}
function updateBotStatus(t){$("lerakBotStatus").textContent=t}
function startBotFallback(){
 clearInterval(botTimer);botEnabled=false;let remaining=30;updateBotStatus(`🌐 រង់ចាំអ្នកលេងពិត ${kh(remaining)} វិនាទី…`);
 botTimer=setInterval(()=>{remaining--;if(remaining>0){updateBotStatus(`🌐 រង់ចាំអ្នកលេងពិត ${kh(remaining)} វិនាទី…`);return}clearInterval(botTimer);botEnabled=true;updateBotStatus("🤖 មិនមានអ្នកលេងពិត — Bot ចូលលេងជំនួស។");maybeBot()},1000)
}
function fmt(ms){const s=Math.max(0,Math.ceil(ms/1000));return`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}
function addIncrement(side){if(side===W)whiteMs+=INC;else blackMs+=INC}
function paintClock(){
 $("wc").textContent=fmt(whiteMs);$("bc").textContent=fmt(blackMs);
 $("wcBox").classList.toggle("active",turn===W&&!gameOver);$("bcBox").classList.toggle("active",turn===B&&!gameOver);
 $("wcBox").classList.toggle("danger",whiteMs<=30000);$("bcBox").classList.toggle("danger",blackMs<=30000)
}
function startClock(){
 clearInterval(clockTimer);whiteMs=MAIN;blackMs=MAIN;lastTick=Date.now();lastTurn=turn;
 clockTimer=setInterval(()=>{if(gameOver)return;const now=Date.now(),dt=now-lastTick;lastTick=now;if(turn===W)whiteMs=Math.max(0,whiteMs-dt);else blackMs=Math.max(0,blackMs-dt);
 if(whiteMs<=0||blackMs<=0){gameOver=true;clearInterval(clockTimer);msg(`⏱️ ${whiteMs<=0?"ភាគីខ្មៅ":"ភាគីស"} ឈ្នះដោយពេលវេលាអស់។`)}paintClock()},100);paintClock()
}
function render(){
 const el=$("board");el.innerHTML="";
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const cell=document.createElement("button");cell.type="button";cell.className=`cell ${((r+c)%2===0)?"light":"dark"}`;
  if(selected?.[0]===r&&selected?.[1]===c)cell.classList.add("selected");
  if(phase==="opening"){if(selectedOpening.some(([a,b])=>a===r&&b===c))cell.classList.add("opening-choice")}
  else if(callTrap){if(callTrap.captureMoves.some(m=>m.to[0]===r&&m.to[1]===c))cell.classList.add("capture-choice")}
  else if(selected){
   const legal=normalMoves(selected[0],selected[1]);if(legal.some(([a,b])=>a===r&&b===c))cell.classList.add("move-choice");
  }
  cell.onclick=()=>clickCell(r,c);
  const p=board[r][c];if(p){const pe=document.createElement("div");pe.className=`piece ${p.side}${p.king?" king":""}`;cell.appendChild(pe)}
  el.appendChild(cell)
 }
 $("actions").innerHTML="";
 if(phase==="opening"&&selectedOpening.length===2){const b=document.createElement("button");b.className="action-btn";b.textContent="បញ្ជាក់ចេញកូន ២";b.onclick=confirmOpening;$("actions").appendChild(b)}
 if(phase==="normal"&&!callTrap&&!pendingCall&&!gameOver){const b=document.createElement("button");b.className=`action-btn ${callArmed?"armed":""}`;b.textContent=callArmed?"🪤 ហៅរែក (បានបើក)":"🪤 ហៅរែក";b.onclick=tryCallTrap;$("actions").appendChild(b)}
 $("wc").setAttribute("aria-label",`សល់ ${fmt(whiteMs)}`);$("bc").setAttribute("aria-label",`សល់ ${fmt(blackMs)}`);
 if(gameOver)$("turn").textContent="🏁 ចប់ការប្រកួត";
 else if(callTrap)$("turn").textContent=`🪤 ហៅរែក៖ ${sideName(turn)} ត្រូវឆ្លើយតប`;
 else if(phase==="opening")$("turn").textContent=`ដំណាក់កាលដំបូង • ${sideName(turn)}`;
 else $("turn").textContent=`វេន៖ ${sideName(turn)}`;
 paintClock()
}
function reset(){
 clearTimeout(botTimer);clearInterval(botTimer);clearInterval(clockTimer);
 board=initialBoard();turn=Math.random()<.5?W:B;humanSide=turn;phase="opening";selectedOpening=[];selected=null;gameOver=false;callTrap=null;pendingCall=null;callArmed=false;botEnabled=false;
 $("humanSide").textContent=sideName(humanSide);$("botSide").textContent=sideName(other(humanSide));
 updateBotStatus("🌐 កំពុងស្វែងរកអ្នកលេងពិត…");msg(`ដំណាក់កាលដំបូង៖ ${sideName(turn)} ជ្រើសកូន ២ ក្នុងពេលតែមួយ។`);render();startClock();startBotFallback();
}
function startGameMode(m){
 mode=m;$("modeMenu").hidden=true;$("gameArea").hidden=false;
 $("modeTitle").textContent="រែក";$("modeSub").textContent=m==="normal"?"រែកធម្មតា":"រែកព័ទ្ធ";reset();
 msg(m==="normal"?"រែកធម្មតា៖ ស្តេចមិនអាចដើរ។ រែកកើតនៅក្រឡាដែលកូនទើបចូល។":"រែកព័ទ្ធ៖ រក្សារែកធម្មតា ហើយបន្ថែមការព័ទ្ធក្រុមកូនដែលគ្មានប្រឡោះទំនេរ។")
}
function backToModes(){clearTimeout(botTimer);clearInterval(botTimer);clearInterval(clockTimer);gameOver=true;$("gameArea").hidden=true;$("modeMenu").hidden=false}
function showRules(){
 $("modalContent").innerHTML=`
 <h2>📖 ច្បាប់រែក — កំណែចាស់របស់គម្រោង</h2>
 <p class="rule"><b>១. ចេញកូនដំបូង:</b> ជ្រើសកូនទ័ព ២ នៅជួរមុខ ដែលរំលងគ្នា ១ ក្រឡា បន្ទាប់មកបញ្ជាក់ឱ្យកូនទាំង ២ ចេញទៅមុខ ១ ក្រឡា។ ភាគីទាំងពីរធ្វើដូចគ្នា។</p>
 <p class="rule"><b>២. រែកធម្មតា:</b> កូនទ័ពដើរត្រង់ផ្ដេក/បញ្ឈរ តាមក្រឡាទំនេររហូតដល់ជួបកូន។ ស្តេច <b>មិនអាចដើរ</b>។ បើកូនរបស់អ្នកចូលទៅក្រឡាដែលមានកូនសត្រូវ ២ នៅសងខាងតាមជួរដេក ឬជួរឈរ → ចាប់កូនសត្រូវ ២។ ឈ្នះពេលកូនទ័ពសត្រូវស្លាប់អស់ ឬស្តេចត្រូវបានរែក។</p>
 <p class="rule"><b>៣. រែកព័ទ្ធ:</b> រក្សាច្បាប់រែកធម្មតាទាំងអស់ ហើយបន្ថែមការព័ទ្ធ៖ ក្រុមកូនសត្រូវដែលជាប់គ្នាតាមទិស ៤ ហើយគ្មានក្រឡាទំនេរ (liberty) ជាប់ក្រុមទៀត → ក្រុមនោះត្រូវបានចាប់។ បើមានស្តេចក្នុងក្រុម → ស្តេចត្រូវបានព័ទ្ធ និងចាញ់។</p>
 <p class="rule"><b>៤. ហៅរែក:</b> អាចបើក «ហៅរែក» មុនដើរកូនទ័ព។ បន្ទាប់ពីដើរ ប្រសិនបើគូប្រកួតមានចលនាដែលអាចរែកកូនគោលដៅបាន គូប្រកួតត្រូវជ្រើសចលនាដែលបានបង្ហាញ។</p>
 <p class="rule"><b>៥. ពេលវេលា:</b> 3:00 + 2 វិនាទីបន្ថែមរាល់ពេលបញ្ចប់វេន។ រង់ចាំអ្នកលេងពិត 30 វិនាទី បន្ទាប់មក Bot ចូលជំនួស។</p>`;
 $("modal").classList.add("show")
}
function closeModal(){$("modal").classList.remove("show")}
$("restart").onclick=reset;
window.startGameMode=startGameMode;window.backToModes=backToModes;window.reset=reset;window.tryCallTrap=tryCallTrap;window.showRules=showRules;window.closeModal=closeModal;
})();
