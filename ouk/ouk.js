const W="white",B="black";
const NAME={K:"អង្គ",Q:"នាង",G:"គោល",N:"សេះ",R:"ទូក",P:"ត្រី"};
const ICON={K:"♔",Q:"♕",G:"♗",N:"♘",R:"♜",P:"●"};
let board,turn,selected,gameOver,firstMove={white:true,black:true},kingEverChecked={white:false,black:false};

const inb=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const opp=s=>s===W?B:W;
const sideName=s=>s===W?"ស":"ខ្មៅ";
const kh=n=>String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d]);

function makePiece(side,type){return{side,type};}
function setup(){
 board=Array.from({length:8},()=>Array(8).fill(null));
 // Traditional Khmer setup used for this V2: Touk, Ses, Koul, Neang, Ang, Koul, Ses, Touk.
 const back=["R","N","G","Q","K","G","N","R"];
 for(let c=0;c<8;c++){board[0][c]=makePiece(B,back[c]);board[1][c]=makePiece(B,"P");board[6][c]=makePiece(W,"P");board[7][c]=makePiece(W,back[c]);}
 turn=W;selected=null;gameOver=false;firstMove={white:true,black:true};kingEverChecked={white:false,black:false};
 render();msg("ស ចាប់ផ្តើម។ ជ្រើសកូនអុកមួយ។");
}

function addStep(out,r,c,kind="move"){
 if(!inb(r,c))return;
 const t=board[r][c]; if(t?.side===board._side)return;
 if(t?.type==="K")return;
 out.push({r,c,kind:t?"capture":kind});
}
function pseudo(r,c){
 const p=board[r][c],out=[]; if(!p)return out; board._side=p.side;
 const f=p.side===W?-1:1;
 const add=(rr,cc,kind="move")=>addStep(out,rr,cc,kind);

 if(p.type==="K"){
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(r+dr,c+dc);
  if(firstMove[p.side]&&!kingEverChecked[p.side]&&!inCheck(p.side)){
   for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
    const rr=r+dr,cc=c+dc;if(inb(rr,cc)&&!board[rr][cc])out.push({r:rr,c:cc,kind:"special"});
   }
  }
 }else if(p.type==="Q"){
  for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]])add(r+dr,c+dc);
  if(firstMove[p.side]){
   const rr=r+2*f;if(inb(rr,c)&&!board[r+f][c]&&!board[rr][c])out.push({r:rr,c,kind:"special"});
  }
 }else if(p.type==="G"){
  for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[f,0]])add(r+dr,c+dc);
 }else if(p.type==="N"){
  for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(r+dr,c+dc);
 }else if(p.type==="R"){
  for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
   let rr=r+dr,cc=c+dc;
   while(inb(rr,cc)){
    if(board[rr][cc]){if(board[rr][cc].side!==p.side&&board[rr][cc].type!=="K")out.push({r:rr,c:cc,kind:"capture"});break}
    out.push({r:rr,c:cc,kind:"move"});rr+=dr;cc+=dc;
   }
  }
 }else if(p.type==="P"){
  const rr=r+f;if(inb(rr,c)&&!board[rr][c])add(rr,c);
  for(const dc of [-1,1]){const cc=c+dc;if(inb(rr,cc)&&board[rr][cc]?.side===opp(p.side)&&board[rr][cc].type!=="K")add(rr,cc,"capture")}
 }
 delete board._side;return out;
}

function findKing(s){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s&&board[r][c].type==="K")return[r,c];return null}
function attacked(r,c,by){
 for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
  const p=board[rr][cc];if(!p||p.side!==by)continue;
  if(p.type==="R"){
   if(rr!==r&&cc!==c)continue;
   const dr=Math.sign(r-rr),dc=Math.sign(c-cc);let a=rr+dr,b=cc+dc,clear=true;
   while(a!==r||b!==c){if(board[a][b]){clear=false;break}a+=dr;b+=dc}
   if(clear)return true;
  }else if(p.type==="P"){
   const f=p.side===W?-1:1;if(rr+f===r&&(cc-1===c||cc+1===c))return true;
  }else if(p.type==="N"){
   if(Math.abs(rr-r)*Math.abs(cc-c)===2)return true;
  }else if(p.type==="K"){
   if(Math.max(Math.abs(rr-r),Math.abs(cc-c))===1)return true;
  }else if(p.type==="Q"){
   if(Math.abs(rr-r)===1&&Math.abs(cc-c)===1)return true;
  }else if(p.type==="G"){
   const dr=r-rr,dc=c-cc,f=p.side===W?-1:1;
   if((Math.abs(dr)===1&&Math.abs(dc)===1)||(dr===f&&dc===0))return true;
  }
 }return false;
}
function inCheck(s){const k=findKing(s);return k?attacked(k[0],k[1],opp(s)):true}

function legal(r,c){
 const p=board[r][c];if(!p)return[];
 const out=[];
 for(const m of pseudo(r,c)){
  const old=board[m.r][m.c];board[m.r][m.c]=p;board[r][c]=null;
  const ok=!inCheck(p.side);
  board[r][c]=p;board[m.r][m.c]=old;
  if(ok)out.push(m);
 }return out;
}
function allMoves(s){const a=[];for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s)for(const m of legal(r,c))a.push({...m,fr:r,fc:c});return a}

function move(fr,fc,tr,tc){
 const p=board[fr][fc],capt=board[tr][tc];
 board[tr][tc]=p;board[fr][fc]=null;
 firstMove[p.side]=false;
 if(p.type==="P"){
  const promo=p.side===W?2:5;
  if(tr===promo)p.type="Q";
 }
 if(inCheck(p.side)){} // safety placeholder
 const other=opp(p.side);
 if(inCheck(other))kingEverChecked[other]=true;
 turn=other;selected=null;

 if(capt?.type==="K"){gameOver=true;msg(`${sideName(p.side)} ឈ្នះ! អង្គគូប្រកួតត្រូវបានស៊ី។`);render();return}
 const moves=allMoves(turn);
 if(moves.length===0){
  gameOver=true;
  if(inCheck(turn))msg(`${sideName(p.side)} ឈ្នះ! អុកងាប់ (Checkmate)។`);
  else msg("ស្មើ! មិនមានចលនាស្របច្បាប់ (Stalemate)។");
 }else if(inCheck(turn))msg(`⚠️ ${sideName(turn)} ជាប់អុក។`);
 else msg(`វេន ${sideName(turn)}។`);
 render();
}
function clickCell(r,c){
 if(gameOver)return;
 if(selected){
  const m=legal(selected.r,selected.c).find(x=>x.r===r&&x.c===c);
  if(m){move(selected.r,selected.c,r,c);return}
  if(board[r][c]?.side===turn){selected={r,c};render();return}
  selected=null;render();return;
 }
 if(board[r][c]?.side===turn){selected={r,c};render()}
}
function count(s){let n=0;for(const row of board)for(const p of row)if(p?.side===s)n++;return n}
function render(){
 const el=document.getElementById("board");el.innerHTML="";
 const moves=selected?legal(selected.r,selected.c):[];
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const cell=document.createElement("div");cell.className="cell "+((r+c)%2?"dark":"light");
  if(selected?.r===r&&selected?.c===c)cell.classList.add("selected");
  const m=moves.find(x=>x.r===r&&x.c===c);if(m)cell.classList.add(m.kind==="capture"?"capture":"move");
  const p=board[r][c];if(p){const d=document.createElement("div");d.className="piece "+(p.side===W?"whitePiece":"blackPiece");d.textContent=ICON[p.type];d.title=NAME[p.type];cell.appendChild(d)}
  cell.onclick=()=>clickCell(r,c);el.appendChild(cell);
 }
 document.getElementById("turn").textContent=gameOver?"ចប់ការប្រកួត":`វេន៖ ${sideName(turn)}`;
 document.getElementById("status").textContent=gameOver?"ចប់":(inCheck(turn)?"⚠️ ជាប់អុក":"លេងតាមវេន");
 document.getElementById("whiteCount").textContent=kh(count(W));
 document.getElementById("blackCount").textContent=kh(count(B));
}
function msg(t){document.getElementById("message").textContent=t}
document.getElementById("restart").onclick=setup;
setup();
