const E=id=>document.getElementById(id), boardEl=E("board"),turnEl=E("turn"),msg=E("msg"),bc=E("bc"),wc=E("wc");
const W="white",B="black",D4=[[1,0],[-1,0],[0,1],[0,-1]],D8=[...D4,[1,1],[1,-1],[-1,1],[-1,-1]];
let board,turn,opening,sel=null,pairSel=null,over=false;

function init(){
 board=Array.from({length:8},()=>Array(8).fill(null));
 // 15 ទ័ព + 1 ស្តេច = 16 ម្នាក់ៗ
 for(let c=0;c<8;c++) board[0][c]={side:B,king:false};
 for(let c=1;c<8;c++) board[2][c]={side:B,king:false}; // 7 ទ័ព
 board[1][0]={side:B,king:true}; // សរុប 16
 for(let c=0;c<8;c++) board[5][c]={side:W,king:false};
 for(let c=0;c<7;c++) board[7][c]={side:W,king:false};
 board[6][7]={side:W,king:true}; // សរុប 16
 turn=Math.random()<.5?W:B; opening=true; sel=null;pairSel=null;over=false;render();
 say(`ដំណាក់កាលដំបូង៖ ${name(turn)} ត្រូវចេញកូន ២ ជាមួយគ្នា។`);
}
E("reset").onclick=init;
function name(s){return s===W?"ភាគីស":"ភាគីខ្មៅ"}
function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function normalMoves(r,c){const p=board[r][c],a=[];if(!p)return a;for(const [dr,dc] of D4){let nr=r+dr,nc=c+dc;while(inside(nr,nc)){if(board[nr][nc])break;a.push([nr,nc]);nr+=dr;nc+=dc}}return a}

/* Opening: one click chooses the first piece; the paired piece is exactly 2 squares away.
   Both pieces are moved together into the chosen two target squares, so one opening turn
   always moves TWO pieces, never one. */
function openingPairTargets(r,c){
 const out=[];
 for(const [dr,dc] of D4){
   const r2=r+2*dr,c2=c+2*dc;
   const mr=r+dr,mc=c+dc;
   if(inside(r2,c2)&&inside(mr,mc)&&!board[r2][c2]&&!board[mr][mc]) out.push([r2,c2,mr,mc]);
 }
 return out;
}
function doOpening(r,c){
 const p=board[r][c];
 if(!p||p.side!==turn||p.king){say("ដំណាក់កាលដំបូងត្រូវជ្រើសកូនទ័ព។");return}
 if(!pairSel){
   const opts=openingPairTargets(r,c);
   if(!opts.length){say("កូននេះមិនមានគូដែលរំលងមួយប្រឡោះបានទេ។");return}
   sel=[r,c];pairSel=opts;render();say("ជ្រើសក្រឡាទីពីរ។ គូកូន ២ នឹងចេញជាមួយគ្នា។");return;
 }
 const chosen=pairSel.find(x=>x[0]===r&&x[1]===c);
 if(!chosen){sel=null;pairSel=null;render();say("ជ្រើសក្រឡាគូដែលបានបន្លិច។");return}
 const [sr,sc]=sel,[tr,tc,mr,mc]=chosen;
 // ទីតាំងថ្មីរបស់កូនទី១ និងកូនទី២៖ គូរំលងមួយក្រឡា
 board[tr][tc]=board[sr][sc];
 board[sr][sc]=null;
 // កូនទី២យកពីក្រឡាដែលនៅក្នុងជួរដើម/តំបន់ដើមដែលមានភាគីដូចគ្នា
 // បើមិនមាននៅទីនោះទេ គឺបញ្ចប់ការបើកឆាកដោយការបញ្ជាក់ថាកូនពីរត្រូវចេញ។
 // ដើម្បីកុំបាត់កូន យកកូនដូចគ្នាពីក្រឡាមិនជាប់ target ដែលជ្រើសបានដោយប្រព័ន្ធ
 let source=null;
 for(const [dr,dc] of D4){
   const rr=sr+dr,cc=sc+dc;
   if(inside(rr,cc)&&board[rr][cc]?.side===turn&&!board[rr][cc].king){source=[rr,cc];break}
 }
 if(source){board[mr][mc]=board[source[0]][source[1]];board[source[0]][source[1]]=null;}
 else {board[mr][mc]={side:turn,king:false};}
 sel=null;pairSel=null;
 turn=turn===W?B:W;
 // បន្ទាប់ពីភាគីទាំងពីរបានចេញគូ ១ លើក -> ចូលលេងធម្មតា
 if(opening && window.openingTurns===undefined) window.openingTurns=1;
 else window.openingTurns=(window.openingTurns||1)+1;
 if(window.openingTurns>=2){opening=false;say("ការចេញកូនដំបូងរបស់ភាគីទាំងពីរចប់។ ឥឡូវដើរធម្មតា មួយកូនម្តង។")}
 else say(`ភាគីទីមួយបានចេញ ២ កូន។ ឥឡូវ ${name(turn)} ចេញ ២ កូន។`);
 render();
}

function captureAt(r,c,side){
 const e=side===W?B:W,v=[];
 if(inside(r,c-1)&&inside(r,c+1)&&board[r][c-1]?.side===e&&board[r][c+1]?.side===e)v.push([r,c-1],[r,c+1]);
 if(inside(r-1,c)&&inside(r+1,c)&&board[r-1][c]?.side===e&&board[r+1][c]?.side===e)v.push([r-1,c],[r+1,c]);
 return v;
}
function capture(r,c,side){
 const v=captureAt(r,c,side);let king=false;
 for(const [rr,cc] of v){if(board[rr][cc]?.king)king=true;board[rr][cc]=null}
 return {n:v.length,king};
}
/* ព័ទ្ធពិនិត្យ 8 ទិស។ កូននៅរស់បើមានសូម្បីតែ 1 ប្រឡោះទំនេរ។ */
function surround(){
 const dead=[],kingDead=[];
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
   const p=board[r][c];if(!p)continue;
   let free=0;
   for(const [dr,dc] of D8){
     const rr=r+dr,cc=c+dc;
     if(inside(rr,cc)&&!board[rr][cc])free++;
   }
   if(free===0){
     // បើគ្រប់ 8 ទិសជាកូនគូប្រកួត ឬជាប់គែមដែលគ្មានប្រឡោះ? សម្រាប់ការព័ទ្ធ ត្រូវមានអ្នកគូប្រកួតនៅជុំវិញ។
     let enemy=0;
     for(const [dr,dc] of D8){const rr=r+dr,cc=c+dc;if(inside(rr,cc)&&board[rr][cc]?.side!==p.side)enemy++}
     if(enemy>0){if(p.king)kingDead.push(p.side);else dead.push([r,c])}
   }
 }
 for(const [r,c] of dead)board[r][c]=null;
 return kingDead;
}
function click(r,c){
 if(over)return;
 if(opening){doOpening(r,c);return}
 const p=board[r][c];
 if(sel){
  const [sr,sc]=sel;
  if(normalMoves(sr,sc).some(([a,b])=>a===r&&b===c)){
   const moved=board[sr][sc];board[r][c]=moved;board[sr][sc]=null;sel=null;
   const cap=capture(r,c,moved.side);
   if(cap.king){over=true;say(`${name(moved.side)} ឈ្នះ! ស្តេចត្រូវបានរែក។`)}
   else{
    const kd=surround();
    if(kd.length){over=true;say(`${name(kd[0])} ចាញ់! ស្តេចត្រូវបានព័ទ្ធ។`)}
    else{turn=turn===W?B:W;say(cap.n===2?"រែកបាន ២ កូន។":"មិនមានរែក។")}
   }
   render();return;
  }
  sel=null;
 }
 if(p?.side===turn){sel=[r,c];say(`បានជ្រើស ${p.king?"ស្តេច":"កូនទ័ព"}។`)}else say("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន។");
 render();
}
function render(){
 boardEl.innerHTML="";
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const x=document.createElement("div");x.className="cell";
  if(sel?.[0]===r&&sel?.[1]===c)x.classList.add("sel");
  if(opening&&pairSel?.some(a=>a[0]===r&&a[1]===c))x.classList.add("go");
  if(!opening&&sel&&normalMoves(...sel).some(a=>a[0]===r&&a[1]===c))x.classList.add("go");
  x.onclick=()=>click(r,c);
  const p=board[r][c];if(p){const q=document.createElement("div");q.className=`piece ${p.side}${p.king?" king":""}`;x.appendChild(q)}
  boardEl.appendChild(x);
 }
 const kh=n=>String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d]);
 bc.textContent=kh(count(B));wc.textContent=kh(count(W));turnEl.textContent=over?"ចប់ការប្រកួត":`វេន៖ ${name(turn)}${opening?" · ចេញកូន ២":"}`;
}
function count(s){let n=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s)n++;return n}
function say(t){msg.textContent=t}
init();