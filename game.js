const boardEl = document.getElementById("board");
const turnText = document.getElementById("turnText");
const message = document.getElementById("message");
const blackCount = document.getElementById("blackCount");
const whiteCount = document.getElementById("whiteCount");
const newGame = document.getElementById("newGame");

const B = "black", W = "white";

let board, turn, selected, gameOver;
// ដំណាក់កាលដំបូង៖ ភាគីនីមួយៗត្រូវដើរ ២ កូនមុន
let openingMoves = {black: 0, white: 0};
let openingPhase = true;

function initialBoard(){
  const b = Array.from({length:8},()=>Array(8).fill(null));
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
  openingMoves={black:0,white:0};
  openingPhase=true;
  render();
  setMessage(`ចាប់ផ្ដើមដោយចៃដន្យ៖ ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} ដើរមុន។ ដំណាក់កាលដំបូងត្រូវដើរ ២ កូនម្នាក់ៗ។`);
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

/*
  រែក៖ កូនដែលមានគូប្រកួតនៅខាងទល់មុខតាមជួរដេក ឬជួរឈរ
  អាចត្រូវរែកនៅពេលក្រឡាខាងទាំងពីរត្រូវបានបិទ។
  Logic នេះពិនិត្យទាំង ៤ ទិស ដូច្នេះរែកបានទាំងជួរដេក និងជួរឈរ។
*/
function captureByLine(r,c){
  const p=board[r][c];
  if(!p) return [];
  const enemy=p.side===W?B:W;
  const captured=[];

  // ពិនិត្យគូជាប់គ្នាទាំងផ្ដេក និងបញ្ឈរ
  for(const [dr,dc] of directions()){
    const r1=r+dr,c1=c+dc;
    const r2=r-dr,c2=c-dc;
    if(inBoard(r1,c1)&&inBoard(r2,c2)
       && board[r1][c1]?.side===enemy
       && board[r2][c2]?.side===enemy){
      captured.push([r1,c1],[r2,c2]);
    }
  }
  return captured;
}

function surrounded(r,c){
  const p=board[r][c]; if(!p) return false;
  // បើនៅសល់ប្រឡោះទំនេរមួយ ឬច្រើន កូននៅរស់
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
    if(p && !p.king && surrounded(r,c)) dead.push([r,c]);
  }
  for(const [r,c] of dead) board[r][c]=null;
}

function applyCaptures(){
  const dead = new Set();
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=board[r][c];
    if(!p) continue;
    for(const [rr,cc] of captureByLine(r,c)){
      if(board[rr][cc] && !board[rr][cc].king){
        dead.add(`${rr},${cc}`);
      }
    }
  }
  for(const key of dead){
    const [r,c]=key.split(",").map(Number);
    board[r][c]=null;
  }
  return dead.size;
}

function countSide(side){
  let n=0;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(board[r][c]?.side===side)n++;
  return n;
}

function kingExists(side){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.side===side && board[r][c]?.king)return true;
  return false;
}

function nextTurn(){
  turn=turn===W?B:W;
}

function finishOpeningIfNeeded(){
  if(openingMoves.black>=2 && openingMoves.white>=2){
    openingPhase=false;
    return true;
  }
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

      // រាប់វេនដំណាក់កាលដំបូង
      if(openingPhase) openingMoves[turn]++;

      // រែកត្រូវពិនិត្យទាំងជួរដេក និងជួរឈរ
      const captured=applyCaptures();

      // បន្ទាប់ពីរែក ពិនិត្យការព័ទ្ធ
      removeSurrounded();

      if(!kingExists(B)||!kingExists(W)){
        gameOver=true;
        setMessage(!kingExists(B)?"ស្តេចខ្មៅចាញ់!":"ស្តេចសចាញ់!");
      }else{
        const justFinished=finishOpeningIfNeeded();
        nextTurn();

        if(justFinished){
          setMessage(`ដំណាក់កាលដំបូងចប់ហើយ។ ឥឡូវនេះដើរធម្មតា — វេន ${turn===W?"ភាគីស":"ភាគីខ្មៅ"}។`);
        }else if(openingPhase){
          setMessage(`ដំណាក់កាលដំបូង៖ ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} ត្រូវដើរ។`);
        }else if(captured>0){
          setMessage(`បានរែកកូន ${captured}។ វេន ${turn===W?"ភាគីស":"ភាគីខ្មៅ"}។`);
        }else{
          setMessage(`វេន ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} ដើរ។`);
        }
      }
      render(); return;
    }
    selected=null;
  }

  if(p && p.side===turn){
    // ដំណាក់កាលដំបូង ក៏អនុញ្ញាតឱ្យជ្រើសស្តេច ប៉ុន្តែគោលបំណងគឺដាក់កូនចេញមុខ
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

  const kh=n=>String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d]);
  blackCount.textContent=kh(countSide(B));
  whiteCount.textContent=kh(countSide(W));
  turnText.textContent=gameOver?"ចប់ការប្រកួត":
    openingPhase
      ? `វេន៖ ${turn===W?"ភាគីស ⚪":"ភាគីខ្មៅ ⚫"} · ដំណាក់កាលដំបូង ${kh(openingMoves[turn])}/២`
      : `វេន៖ ${turn===W?"ភាគីស ⚪":"ភាគីខ្មៅ ⚫"}`;
}

function setMessage(t){message.textContent=t}
reset();
