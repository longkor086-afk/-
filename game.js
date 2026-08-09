const B="black",W="white",DIR=[[1,0],[-1,0],[0,1],[0,-1]];
const el=id=>document.getElementById(id);let board,turn,phase="opening",pick=[],gameOver=false;
el("new").onclick=reset;
function empty(){return Array.from({length:8},()=>Array(8).fill(null))}
function reset(){
 board=empty();
 // ខ្មៅ៖ ៧ កូនខាងលើ + ៨ កូនជួរទី២ + ស្តេច = ១៦
 for(let c=1;c<8;c++)board[0][c]={side:B,king:false};
 for(let c=0;c<8;c++)board[1][c]={side:B,king:false};
 board[1][0]={side:B,king:true};
 // ស៖ ៨ កូនជួរទី៦ + ៧ កូនជួរខាងក្រោម + ស្តេច = ១៦
 for(let c=0;c<8;c++)board[5][c]={side:W,king:false};
 for(let c=0;c<7;c++)board[7][c]={side:W,king:false};
 board[6][7]={side:W,king:true};
 turn=Math.random()<.5?B:W;phase="opening";pick=[];gameOver=false;render();
 msg(`វេន ${turn===B?"ភាគីខ្មៅ":"ភាគីស"}៖ ជ្រើសកូន ២ ក្នុងពេលតែមួយ។`);
}
function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function normalMoves(r,c){let p=board[r][c],a=[];if(!p)return a;for(const[dR,dC]of DIR){let R=r+dR,C=c+dC;while(inside(R,C)){if(board[R][C])break;a.push([R,C]);R+=dR;C+=dC}}return a}

/* បើកឆាក៖ ជ្រើស ២ កូនដែលស្ថិតលើជួរដូចគ្នា និងមាន ១ ក្រឡារវាង */
function pairOK(a,b){
 const [r1,c1]=a,[r2,c2]=b;
 if(!board[r1][c1]||!board[r2][c2])return false;
 if(board[r1][c1].side!==turn||board[r2][c2].side!==turn)return false;
 if(board[r1][c1].king||board[r2][c2].king)return false;
 return (r1===r2&&Math.abs(c1-c2)===2)||(c1===c2&&Math.abs(r1-r2)===2);
}
function pairTargets(a,b){
 // កូន ២ ចេញ "ជាមួយគ្នា" មួយជំហានទៅខាងមុខតាមទិសរបស់ភាគី
 const [r1,c1]=a,[r2,c2]=b;
 let dr=turn===B?1:-1,dc=0;
 // បើគូស្ថិតជួរឈរ ក៏អនុញ្ញាតឱ្យចេញតាមជួរដេកទៅខាងក្នុង
 if(c1===c2){dr=0;dc=turn===B?1:-1}
 const t1=[r1+dr,c1+dc],t2=[r2+dr,c2+dc];
 if(inside(...t1)&&inside(...t2)&&!board[t1[0]][t1[1]]&&!board[t2[0]][t2[1]])return[t1,t2];
 return[];
}
function doPair(a,b){
 const targets=pairTargets(a,b);if(targets.length!==2)return false;
 const p1=board[a[0]][a[1]],p2=board[b[0]][b[1]];
 board[targets[0][0]][targets[0][1]]=p1;board[targets[1][0]][targets[1][1]]=p2;
 board[a[0]][a[1]]=null;board[b[0]][b[1]]=null;return true;
}

/* រែកតែទីតាំងដែលកូនទើបដើរចូល */
function captureAt(r,c,side){
 const e=side===B?W:B,v=[];
 if(inside(r,c-1)&&inside(r,c+1)&&board[r][c-1]?.side===e&&board[r][c+1]?.side===e)v.push([r,c-1],[r,c+1]);
 if(inside(r-1,c)&&inside(r+1,c)&&board[r-1][c]?.side===e&&board[r+1][c]?.side===e)v.push([r-1,c],[r+1,c]);
 return v;
}
function captureAtBoth(moved){
 let king=false;const v=captureAt(moved.r,moved.c,moved.side);
 for(const[r,c]of v){if(board[r][c]?.king)king=true;board[r][c]=null}
 return{v,king};
}

/* ព័ទ្ធ ៨ ទិស៖ គែមក្តារក៏រាប់ជាការបិទ។ តែបើមានក្រឡាជាប់ណាមួយទំនេរ -> រស់ */
function surrounded(r,c){
 const p=board[r][c];if(!p)return false;
 for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
   if(dr===0&&dc===0)continue;
   const R=r+dr,C=c+dc;
   if(inside(R,C)&&!board[R][C])return false;
 }
 return true;
}
function applySurround(){
 const dead=[],kingDead=[];
 for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]&&surrounded(r,c)){
   if(board[r][c].king)kingDead.push(board[r][c].side);else dead.push([r,c]);
 }
 dead.forEach(([r,c])=>board[r][c]=null);
 return kingDead;
}
function count(s){let n=0;for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s)n++;return n}
function click(r,c){
 if(gameOver)return;
 const p=board[r][c];

 if(phase==="opening"){
   if(p?.side===turn&&!p.king){
     if(pick.length===0){pick=[[r,c]];msg("បានជ្រើសកូនទី១។ ឥឡូវជ្រើសកូនទី២ ដែលមាន ១ ក្រឡានៅចន្លោះ។");}
     else if(pick.length===1){
       if(pick[0][0]===r&&pick[0][1]===c){pick=[];msg("បានលុបការជ្រើស។");}
       else if(pairOK(pick[0],[r,c])){
         const targets=pairTargets(pick[0],[r,c]);
         if(targets.length===2){
           doPair(pick[0],[r,c]);pick=[];
           turn=turn===B?W:B;phase="normal";
           msg("កូន ២ បានចេញជាមួយគ្នារួច។ ចាប់ពីពេលនេះ លេងធម្មតា មួយកូនម្តង។");
         }else msg("ទីតាំងគូនេះមិនមានក្រឡាទំនេរគ្រប់គ្រាន់សម្រាប់ចេញជាមួយគ្នាទេ។");
       }else msg("ត្រូវជ្រើសកូន ២ ដែលនៅចន្លោះគ្នា ១ ក្រឡា ដូច ១ និង ៣ ឬ ២ និង ៤។");
     }
     render();return;
   }
   msg("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន។");render();return;
 }

 if(pick.length){
   const [sr,sc]=pick[0];
   if(normalMoves(sr,sc).some(([R,C])=>R===r&&C===c)){
     const moved=board[sr][sc];board[r][c]=moved;board[sr][sc]=null;pick=[];
     const cap=captureAtBoth({r,c,side:moved.side});
     if(cap.king){gameOver=true;msg(`${moved.side===B?"ភាគីខ្មៅ":"ភាគីស"} ឈ្នះ! ស្តេចត្រូវបានរែក។`);render();return}
     const kd=applySurround();
     if(kd.length){gameOver=true;msg(`${kd[0]===B?"ភាគីខ្មៅ":"ភាគីស"} ចាញ់! ស្តេចត្រូវបានព័ទ្ធ។`);render();return}
     turn=turn===B?W:B;
     msg(cap.v.length===2?"រែកបាន ២ កូន។":"មិនមានរែក។");
     render();return;
   }
   pick=[];
 }
 if(p?.side===turn){pick=[[r,c]];msg(`បានជ្រើស ${p.king?"ស្តេច":"កូនទ័ព"}។ ជ្រើសក្រឡាទិសដៅ។`)}else msg("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន។");
 render();
}
function render(){
 const b=el("board");b.innerHTML="";
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const q=document.createElement("div");q.className="cell";
  if(pick.some(([R,C])=>R===r&&C===c))q.classList.add("selected");
  if(phase==="normal"&&pick.length&&normalMoves(...pick[0]).some(([R,C])=>R===r&&C===c))q.classList.add("can");
  q.onclick=()=>click(r,c);const p=board[r][c];
  if(p){const z=document.createElement("div");z.className=`piece ${p.side}${p.king?" king":""}`;q.appendChild(z)}
  b.appendChild(q);
 }
 const kh=n=>String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d]);
 el("bc").textContent=kh(count(B));el("wc").textContent=kh(count(W));
 el("turn").textContent=gameOver?"ចប់ការប្រកួត":`វេន៖ ${turn===B?"ភាគីខ្មៅ":"ភាគីស"}`;
}
function msg(t){el("msg").textContent=t}reset();