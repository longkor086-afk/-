const boardEl = document.getElementById("board");
const turnText = document.getElementById("turnText");
const message = document.getElementById("message");
const blackCount = document.getElementById("blackCount");
const whiteCount = document.getElementById("whiteCount");
const newGame = document.getElementById("newGame");

let board, turn, selected, gameOver;

const B = "black", W = "white";

function initialBoard(){
  const b = Array.from({length:8},()=>Array(8).fill(null));
  // របៀបដាក់កូនដូចរូបគំរូ: 15 កូនទ័ព + ស្តេច
  for(let c=0;c<8;c++) b[0][c]={side:B,king:false};
  for(let c=0;c<8;c++) b[2][c]={side:B,king:false};
  b[1][0]={side:B,king:true};
  for(let c=0;c<8;c++) b[5][c]={side:W,king:false};
  for(let c=0;c<7;c++) b[7][c]={side:W,king:false};
  b[6][7]={side:W,king:true};
  return b;
}

function reset(){
  board=initialBoard();
  turn=Math.random()<.5?B:W;
  selected=null; gameOver=false;
  render();
  setMessage(`ចាប់ផ្ដើមដោយចៃដន្យ៖ ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} ដើរមុន`);
}
newGame.onclick=reset;

function inBoard(r,c){return r>=0&&r<8&&c>=0&&c<8}
function directions(){return [[1,0],[-1,0],[0,1],[0,-1]]}

function getMoves(r,c){
  const p=board[r][c]; if(!p) return [];
  const moves=[];
  for(const [dr,dc] of directions()){
    let nr=r+dr,nc=c+dc;
    while(inBoard(nr,nc)){
      if(board[nr][nc]) break;
      moves.push([nr,nc]);
      nr+=dr;nc+=dc;
    }
  }
  return moves;
}

function surrounded(r,c){
  const p=board[r][c]; if(!p) return false;
  // នៅសល់ប្រឡោះទំនេរមួយ = មិនស្លាប់
  for(const [dr,dc] of directions()){
    const nr=r+dr,nc=c+dc;
    if(inBoard(nr,nc) && !board[nr][nc]) return false;
  }
  return true;
}

function removeSurrounded(){
  const dead=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];
    if(p && surrounded(r,c)) dead.push([r,c]);
  }
  // មិនអនុវត្តការសម្លាប់ស្តេចដោយស្វ័យប្រវត្តិជាដំណាក់កាល V1
  for(const [r,c] of dead){
    if(!board[r][c].king) board[r][c]=null;
  }
}

function countSide(side){
  let n=0; for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]?.side===side)n++;
  return n;
}

function kingExists(side){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.side===side && board[r][c]?.king)return true;
  return false;
}

function clickCell(r,c){
  if(gameOver)return;
  const p=board[r][c];

  if(selected){
    const [sr,sc]=selected;
    const legal=getMoves(sr,sc).some(([mr,mc])=>mr===r&&mc===c);
    if(legal){
      board[r][c]=board[sr][sc];
      board[sr][sc]=null;
      selected=null;
      // ព័ទ្ធត្រូវបានគណនាបន្ទាប់ពីការដើរ
      removeSurrounded();
      if(!kingExists(B)||!kingExists(W)){
        gameOver=true;
        setMessage(!kingExists(B)?"ស្តេចខ្មៅចាញ់!":"ស្តេចសចាញ់!");
      }else{
        turn=turn===W?B:W;
        setMessage(`វេន ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} ដើរ`);
      }
      render(); return;
    }
    selected=null;
  }

  if(p && p.side===turn){
    selected=[r,c];
    setMessage(`បានជ្រើសរើស${p.king?"ស្តេច":"កូនទ័ព"} — ជ្រើសរើសក្រឡាដើម្បីដើរ`);
  }else{
    setMessage("សូមជ្រើសរើសកូនរបស់ភាគីដែលកំពុងដើរ");
  }
  render();
}

function render(){
  boardEl.innerHTML="";
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cell=document.createElement("div");
    cell.className="cell";
    if(selected?.[0]===r&&selected?.[1]===c)cell.classList.add("selected");
    if(selected && getMoves(...selected).some(([mr,mc])=>mr===r&&mc===c))cell.classList.add("can-move");
    cell.onclick=()=>clickCell(r,c);

    const p=board[r][c];
    if(p){
      const piece=document.createElement("div");
      piece.className=`piece ${p.side}${p.king?" king":""}`;
      cell.appendChild(piece);
    }
    boardEl.appendChild(cell);
  }
  blackCount.textContent=String(countSide(B)).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
  whiteCount.textContent=String(countSide(W)).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
  turnText.textContent=gameOver?"ចប់ការប្រកួត":`វេន៖ ${turn===W?"ភាគីស ⚪":"ភាគីខ្មៅ ⚫"}`;
}
function setMessage(t){message.textContent=t}
reset();
