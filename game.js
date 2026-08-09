const boardEl=document.getElementById("board");
const turnEl=document.getElementById("turn");
const msgEl=document.getElementById("message");
const bc=document.getElementById("bc"), wc=document.getElementById("wc");
document.getElementById("restart").onclick=reset;

const W="white", B="black";
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

let board, turn, phase, selectedOpening=[], selected=null, gameOver=false;

/*
សំខាន់:
ខ្មៅ = ស្តេច ១ + កូនទ័ព ១៥ = ១៦
ការរៀបចំតាមរូប:
ខ្មៅ:
ជួរទី១: ៧ កូន (ក្រឡា ២-៨)
ជួរទី២: ស្តេច ១ (ក្រឡា ១)
ជួរទី៣: ៨ កូន
សរុប ១៦

ស:
ជួរទី៦: ៨ កូន
ជួរទី៧: ស្តេច ១ (ក្រឡា ៨)
ជួរទី៨: ៧ កូន (ក្រឡា ១-៧)
សរុប ១៦
*/
function initialBoard(){
  const a=Array.from({length:8},()=>Array(8).fill(null));

  // ខ្មៅ: 7 + ស្តេច 1 + 8 = 16
  for(let c=1;c<8;c++) a[0][c]={side:B,king:false};
  a[1][0]={side:B,king:true};
  for(let c=0;c<8;c++) a[2][c]={side:B,king:false};

  // ស: 8 + ស្តេច 1 + 7 = 16
  for(let c=0;c<8;c++) a[5][c]={side:W,king:false};
  a[6][7]={side:W,king:true};
  for(let c=0;c<7;c++) a[7][c]={side:W,king:false};

  return a;
}

function reset(){
  board=initialBoard();
  turn=Math.random()<0.5?W:B;
  phase="opening";
  selectedOpening=[];
  selected=null;
  gameOver=false;
  render();
  message(`ដំណាក់កាលដំបូង៖ ${sideName(turn)} ជ្រើសកូន ២ ក្នុងពេលតែមួយ។`);
}

function sideName(s){return s===W?"ភាគីស":"ភាគីខ្មៅ"}
function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function count(s){
  let n=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s)n++;
  return n;
}
function kh(n){return String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d])}

/*
ដំណាក់កាលដំបូង:
ត្រូវជ្រើស ២ កូនក្នុងពេលតែមួយ។
គូដែលត្រឹមត្រូវគឺកូននៅចន្លោះ ២ ក្រឡា (រំលង ១):
- ក្នុងជួរដេក: (0,2), (1,3), ...
- ក្នុងជួរឈរ: (0,2), (1,3), ...
មិនអនុញ្ញាតជ្រើសកូនដែលនៅជាប់គ្នា។
*/
function validOpeningPair(a,b){
  if(!a||!b)return false;
  const [r1,c1]=a,[r2,c2]=b;
  if(r1===r2 && Math.abs(c1-c2)===2)return true;
  if(c1===c2 && Math.abs(r1-r2)===2)return true;
  return false;
}

function openingClick(r,c){
  const p=board[r][c];
  if(!p||p.side!==turn||p.king){
    message("សូមជ្រើសកូនទ័ពរបស់ភាគីដែលកំពុងមានវេន។");
    return;
  }

  // នៅដើមហ្គេម ជ្រើសកូន ២ នៅជួរមុខរបស់ខ្លួន
  const frontRow = turn===B ? 2 : 5;
  if(r!==frontRow){
    message("ដំណាក់កាលដំបូង ត្រូវជ្រើសកូននៅជួរមុខរបស់ភាគីខ្លួន។");
    return;
  }

  if(selectedOpening.length===0){
    selectedOpening=[[r,c]];
    message("បានជ្រើសកូនទី១។ ឥឡូវជ្រើសកូនទី២ ដែលរំលង ១ ប្រឡោះ។");
    render(); return;
  }

  if(selectedOpening[0][0]===r && selectedOpening[0][1]===c){
    selectedOpening=[];
    message("បានលុបការជ្រើស។ សូមជ្រើសកូនទី១។");
    render(); return;
  }

  const a=selectedOpening[0], b=[r,c];
  if(!validOpeningPair(a,b)){
    message("មិនត្រឹមត្រូវ៖ កូនទាំង ២ ត្រូវនៅចន្លោះគ្នា ១ ប្រឡោះ ដូចជា ១&៣, ២&៤, ៣&៥។");
    return;
  }

  selectedOpening=[a,b];
  message("បានជ្រើសកូន ២ ត្រឹមត្រូវ។ ចុចប៊ូតុង «បញ្ជាក់ចេញកូន ២»។");
  render();
}

function confirmOpening(){
  if(selectedOpening.length!==2)return;

  const frontRow = turn===B ? 2 : 5;
  const step = turn===B ? 1 : -1;
  const [a,b]=selectedOpening;

  // កូនទាំង ២ ចេញមកមុខជាមួយគ្នា មួយក្រឡាតាមទិសរបស់ភាគី
  const targets=[[a[0]+step,a[1]],[b[0]+step,b[1]]];

  if(!targets.every(([r,c])=>inside(r,c)&&!board[r][c])){
    message("ក្រឡាខាងមុខមិនទំនេរគ្រប់គ្រាន់ទេ។");
    return;
  }

  const pa=board[a[0]][a[1]], pb=board[b[0]][b[1]];
  board[a[0]][a[1]]=null;
  board[b[0]][b[1]]=null;
  board[targets[0][0]][targets[0][1]]=pa;
  board[targets[1][0]][targets[1][1]]=pb;

  if(!board.__openingDone){
    board.__openingDone=true;
    selectedOpening=[];
    turn=turn===W?B:W;
    message(`ភាគីទីមួយបានចេញកូន ២ រួច។ ឥឡូវ ${sideName(turn)} ជ្រើសកូន ២ តាមច្បាប់ដូចគ្នា។`);
  }else{
    selectedOpening=[];
    phase="normal";
    message("ភាគីទាំងពីរបានចេញកូន ២ រួចហើយ។ ឥឡូវលេងធម្មតា មួយកូនម្តង។");
  }
  render();
}

function normalMoves(r,c){
  const p=board[r][c];if(!p)return[];
  const out=[];
  for(const [dr,dc] of DIRS){
    let nr=r+dr,nc=c+dc;
    while(inside(nr,nc)){
      if(board[nr][nc])break;
      out.push([nr,nc]);
      nr+=dr;nc+=dc;
    }
  }
  return out;
}

function normalClick(r,c){
  const p=board[r][c];

  if(selected){
    const [sr,sc]=selected;
    if(normalMoves(sr,sc).some(([a,b])=>a===r&&b===c)){
      board[r][c]=board[sr][sc];
      board[sr][sc]=null;
      selected=null;
      turn=turn===W?B:W;
      message(`បានដើរ។ ឥឡូវ ${sideName(turn)} ដើរ។`);
      render();
      return;
    }
    selected=null;
  }

  if(p&&p.side===turn){
    selected=[r,c];
    message(`បានជ្រើស ${p.king?"ស្តេច":"កូនទ័ព"}។ ជ្រើសក្រឡាដើម្បីដើរ។`);
  }else{
    message("សូមជ្រើសកូនរបស់ភាគីដែលមានវេន។");
  }
  render();
}

function clickCell(r,c){
  if(gameOver)return;
  if(phase==="opening") openingClick(r,c);
  else normalClick(r,c);
}

function render(){
  boardEl.innerHTML="";

  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cell=document.createElement("div");
    cell.className="cell";

    if(selected?.[0]===r&&selected?.[1]===c)cell.classList.add("selected");

    if(phase==="opening"){
      if(selectedOpening.some(([a,b])=>a===r&&b===c))cell.classList.add("opening-choice");
    }else if(selected){
      if(normalMoves(...selected).some(([a,b])=>a===r&&b===c))cell.classList.add("move-choice");
    }

    cell.onclick=()=>clickCell(r,c);

    const p=board[r][c];
    if(p){
      const el=document.createElement("div");
      el.className=`piece ${p.side}${p.king?" king":""}`;
      cell.appendChild(el);
    }
    boardEl.appendChild(cell);
  }

  // ប៊ូតុងបញ្ជាក់បង្ហាញតែពេលជ្រើស ២ កូនក្នុងដំណាក់កាលដំបូង
  let old=document.getElementById("confirmOpening");
  if(old)old.remove();
  if(phase==="opening"&&selectedOpening.length===2){
    const btn=document.createElement("button");
    btn.id="confirmOpening";
    btn.textContent="បញ្ជាក់ចេញកូន ២";
    btn.style.display="block";
    btn.style.margin="10px auto";
    btn.onclick=confirmOpening;
    boardEl.after(btn);
  }

  bc.textContent=kh(count(B));
  wc.textContent=kh(count(W));
  turnEl.textContent=gameOver?"ចប់ការប្រកួត":`វេន៖ ${sideName(turn)}${phase==="opening"?" · ជ្រើសកូន ២":""}`;
}

function message(t){msgEl.textContent=t}
reset();
