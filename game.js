const boardEl=document.getElementById("board"),turnText=document.getElementById("turnText");
const msg=document.getElementById("message"),bc=document.getElementById("blackCount"),wc=document.getElementById("whiteCount");
document.getElementById("newGame").onclick=reset;
const W="white",B="black",D=[[1,0],[-1,0],[0,1],[0,-1]];
let board,turn,selected=null,gameOver=false,opening=true,openingStep=0,openingPair=null;

/*
ដំណាក់កាលដំបូង:
- មាន "ជួរចេញ" ៨ ប្រឡោះ ដែល UI កំណត់តាមជួរទីចាប់ផ្តើមរបស់ភាគី។
- អ្នកលេងចុចកូនដំបូង/ទីតាំងចាប់ផ្តើម -> កូនទីពីរត្រូវបានដាក់នៅក្រឡាឆ្ងាយ ២
  (រំលងមួយក្រឡា) ក្នុងទិសដូចគ្នា។
- បន្ទាប់ពីភាគីទីមួយចេញគូរបស់ខ្លួន ភាគីទីពីរចេញគូរបស់ខ្លួន។
- បន្ទាប់មកបើកូនទីពីរដើរចូលក្រឡាកណ្ដាលរវាងគូប្រកួត -> រែក ២។
ក្នុង V3 យើងប្រើការជ្រើស "កូនទីមួយ" និង "ក្រឡាគោលដៅ" ដើម្បីបង្កើតគូ។
*/
function initialBoard(){
  const x=Array.from({length:8},()=>Array(8).fill(null));
  // ដាក់កូនជាជួរដើម ដើម្បីអាចជ្រើសគូ ២ កូនសម្រាប់ការបើកឆាក
  for(let c=0;c<8;c++)x[0][c]={side:B,king:false};
  for(let c=0;c<8;c++)x[2][c]={side:B,king:false};
  x[1][0]={side:B,king:true};
  for(let c=0;c<8;c++)x[5][c]={side:W,king:false};
  for(let c=0;c<7;c++)x[7][c]={side:W,king:false};
  x[6][7]={side:W,king:true};
  return x;
}
function reset(){
 board=initialBoard();turn=Math.random()<.5?W:B;selected=null;gameOver=false;
 opening=true;openingStep=0;openingPair=null;render();
 setMsg(`វេន ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} — ជ្រើសកូនដំបូងសម្រាប់ការចេញ ២ កូន។`);
}
function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function moves(r,c){
 const p=board[r][c];if(!p)return[];const out=[];
 for(const [dr,dc] of D){let nr=r+dr,nc=c+dc;while(inside(nr,nc)){if(board[nr][nc])break;out.push([nr,nc]);nr+=dr;nc+=dc}}
 return out;
}

/* រែកនៅទីតាំងទើបដើរចូលតែប៉ុណ្ណោះ */
function captureAt(r,c,side){
 const e=side===W?B:W, v=[];
 if(inside(r,c-1)&&inside(r,c+1)&&board[r][c-1]?.side===e&&board[r][c+1]?.side===e)
   v.push([r,c-1],[r,c+1]);
 if(inside(r-1,c)&&inside(r+1,c)&&board[r-1][c]?.side===e&&board[r+1][c]?.side===e)
   v.push([r-1,c],[r+1,c]);
 return v;
}
function captureNow(r,c,side){
 const v=captureAt(r,c,side);
 let kingCaptured=false;
 for(const [rr,cc] of v){
   if(board[rr][cc]?.side!==side){
     if(board[rr][cc]?.king)kingCaptured=true;
     board[rr][cc]=null;
   }
 }
 return {n:v.length,kingCaptured};
}

/* ព័ទ្ធ: ត្រូវមានគូប្រកួតនៅទាំង ៤ ទិស និងគ្មានប្រឡោះទំនេរ */
function surroundedPieces(){
 const dead=[],kings=[];
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
   const p=board[r][c];if(!p)continue;
   let allEnemy=true, available=0;
   for(const [dr,dc] of D){
     const nr=r+dr,nc=c+dc;
     if(!inside(nr,nc)){allEnemy=false;continue}
     if(!board[nr][nc]){available++;allEnemy=false}
     else if(board[nr][nc].side===p.side){allEnemy=false}
   }
   if(available===0&&allEnemy){
     if(p.king)kings.push(p.side); else dead.push([r,c]);
   }
 }
 for(const [r,c] of dead)board[r][c]=null;
 return kings;
}

function count(s){let n=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s)n++;return n}
function kingExists(s){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s&&board[r][c]?.king)return true;return false}

/*
ការបើកឆាក V3:
- ចុចកូនទីមួយ -> បង្ហាញតែគូដែលអាចរំលងមួយក្រឡា (ចម្ងាយ ២) ក្នុងទិសដេក/ឈរ។
- ចុចក្រឡាគូ -> កូនទីពីរត្រូវបានចម្លងទៅទីតាំងនោះ។
- បន្ទាប់ពីភាគីទាំងពីរចេញគូ -> ចូលលេងធម្មតា។
*/
function openingMoves(r,c){
 const p=board[r][c];if(!p||p.side!==turn)return[];
 const out=[];
 for(const [dr,dc] of D){
   const r2=r+2*dr,c2=c+2*dc;
   const mid=[r+dr,c+dc];
   if(inside(r2,c2)&&inside(mid[0],mid[1])&&!board[r2][c2]&&!board[mid[0]][mid[1]])out.push([r2,c2]);
 }
 return out;
}
function click(r,c){
 if(gameOver)return;
 const p=board[r][c];

 if(opening){
   if(!openingPair){
     if(p&&p.side===turn&&!p.king){
       const opts=openingMoves(r,c);
       if(opts.length){selected=[r,c];openingPair=opts;setMsg("ជ្រើសក្រឡាទីពីរ ដោយរំលងមួយក្រឡា។");}
       else setMsg("កូននេះមិនអាចចេញជាគូបានទេ។");
     }
     render();return;
   }
   if(openingPair.some(([a,b])=>a===r&&b===c)){
     const [sr,sc]=selected;
     board[r][c]={side:turn,king:false};
     // កូនដើមនៅ sr,sc នៅដដែល; នេះបង្កើតគូ ២ កូន
     openingStep++;
     selected=null;openingPair=null;
     if(openingStep===1){
       turn=turn===W?B:W;
       setMsg(`ភាគីទីមួយបានចេញ ២ កូន។ ឥឡូវ ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} ចេញ ២ កូន។`);
     }else{
       opening=false;
       // បន្ទាប់ពីគូទាំងពីរចេញ រក្សាវេនភាគីដែលត្រូវរែក/ដើរបន្ទាប់
       setMsg("ការចេញដំបូងចប់ហើយ។ ឥឡូវចូលលេងធម្មតា — ដើរមួយកូនម្តង។");
     }
     render();return;
   }
   selected=null;openingPair=null;render();return;
 }

 if(selected){
   const [sr,sc]=selected;
   if(moves(sr,sc).some(([a,b])=>a===r&&b===c)){
     const moved=board[sr][sc];board[r][c]=moved;board[sr][sc]=null;selected=null;
     const cap=captureNow(r,c,moved.side);
     if(cap.kingCaptured){
       gameOver=true;setMsg(`${moved.side===W?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានរែក។`);
     }else{
       const kings=surroundedPieces();
       if(kings.length){
         gameOver=true;setMsg(`${kings[0]===W?"ភាគីស":"ភាគីខ្មៅ"} ចាញ់! ស្តេចត្រូវបានព័ទ្ធ។`);
       }else{
         turn=turn===W?B:W;
         setMsg(cap.n===2?"រែកបាន ២ កូន។ វេនបន្ទាប់។":"មិនមានរែក។ វេនបន្ទាប់។");
       }
     }
     render();return;
   }
   selected=null;
 }
 if(p&&p.side===turn){selected=[r,c];setMsg(`បានជ្រើស ${p.king?"ស្តេច":"កូនទ័ព"} — ជ្រើសក្រឡាដើម្បីដើរ`)}
 else setMsg("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន");
 render();
}
function render(){
 boardEl.innerHTML="";
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
   const cell=document.createElement("div");cell.className="cell";
   if(selected?.[0]===r&&selected?.[1]===c)cell.classList.add("selected");
   if(opening&&openingPair?.some(([a,b])=>a===r&&b===c))cell.classList.add("canmove");
   if(!opening&&selected&&moves(...selected).some(([a,b])=>a===r&&b===c))cell.classList.add("canmove");
   cell.onclick=()=>click(r,c);
   const p=board[r][c];if(p){const el=document.createElement("div");el.className=`piece ${p.side}${p.king?" king":""}`;cell.appendChild(el)}
   boardEl.appendChild(cell);
 }
 const kh=n=>String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d]);
 bc.textContent=kh(count(B));wc.textContent=kh(count(W));
 turnText.textContent=gameOver?"ចប់ការប្រកួត":opening?`វេន៖ ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} · ការចេញដំបូង`: `វេន៖ ${turn===W?"ភាគីស":"ភាគីខ្មៅ"}`;
}
function setMsg(t){msg.textContent=t}
reset();
