/*
  OUK CHAKTRANG — standalone Khmer Chess
  No libraries. No external files except style.css.
  Rules implemented from the standard Ouk Chaktrang movement references:
  - King: 1 square any direction; first move may be a knight jump.
  - Neang: 1 square diagonally; first move may advance 2 squares forward if clear.
  - Koul: 1 square diagonally OR 1 square forward.
  - Ses: normal knight.
  - Tuuk: normal rook.
  - Trey: 1 forward, captures 1 diagonal; no double-step/en-passant.
  - Trey promotes to Neang on the opponent's 6th rank.
*/

const SIZE = 8;
const START = [
  ["br","bn","bb","bq","bk","bb","bn","br"],
  Array(8).fill(null),
  Array(8).fill("bp"),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill("wp"),
  Array(8).fill(null),
  ["wr","wn","wb","wk","wq","wb","wn","wr"]
];

const NAMES = {
  k:"ស្តេច", q:"នាង", b:"គូល", n:"សេះ", r:"ទូក", p:"ត្រី"
};

const $ = id => document.getElementById(id);
const boardEl = $("board");
const statusEl = $("status");
const whiteClockEl = $("whiteClock");
const blackClockEl = $("blackClock");
const modal = $("modal");

let board, turn, selected, targets, lastMove, gameOver;
let moved = { white:new Set(), black:new Set() };
let moveHistory = [];
let clocks = { white:180000, black:180000 };
let timer = null;
let lastTick = 0;

function cloneBoard(b){ return b.map(row => row.slice()); }
function inside(r,c){ return r>=0 && r<SIZE && c>=0 && c<SIZE; }
function sideOf(p){ return p ? (p[0]==="w" ? "white" : "black") : null; }
function typeOf(p){ return p ? p[1] : null; }
function enemy(side){ return side==="white" ? "black" : "white"; }
function same(a,b){ return a && b && a.r===b.r && a.c===b.c; }

function resetGame(){
  stopTimer();
  board = cloneBoard(START);
  turn = "white";
  selected = null;
  targets = [];
  lastMove = null;
  gameOver = false;
  moved = {white:new Set(), black:new Set()};
  moveHistory = [];
  clocks = {white:180000, black:180000};
  render();
  startTimer();
}

function glyph(t, side){
  const white = side==="white";
  const pieces = {
    k:"♔", q:"♕", b:"♝", n:"♞", r:"♜", p:white?"♙":"♟"
  };
  return pieces[t];
}

function pieceSvg(p){
  const side = sideOf(p), t = typeOf(p);
  const dark = side==="black";
  const fill = dark ? "#171717" : "#f7f3e9";
  const stroke = dark ? "#050505" : "#8d8d8d";
  const detail = dark ? "#a9a9a9" : "#6e6254";

  let body = "";
  if(t==="r") body = `<path d="M25 13h50v12l-6 7H31l-6-7z"/><path d="M31 32h38l-5 36H36z"/><path d="M20 70h60v10H20z"/><path d="M34 39h32M32 50h36M31 61h38" fill="none" stroke="${detail}" stroke-width="3"/>`;
  if(t==="n") body = `<path d="M28 69c-2-16 2-29 13-36l-5-13 11-10 14 9 10 1-4 10-10 2c10 8 14 19 10 37z"/><path d="M48 21l8 6-10 4" fill="none" stroke="${detail}" stroke-width="3"/><circle cx="58" cy="24" r="2.7" fill="${detail}"/><path d="M24 70h52v10H24z"/>`;
  if(t==="b") body = `<path d="M50 9l12 15-5 8H43l-5-8z"/><path d="M34 32h32l7 10H27z"/><path d="M34 43h32l5 25H29z"/><path d="M20 70h60v10H20z"/><path d="M50 12v16" stroke="${detail}" stroke-width="3"/>`;
  if(t==="q") body = `<path d="M31 22h38l-5 11H36z"/><path d="M38 35h24l-5 33H43z"/><path d="M25 70h50v10H25z"/><path d="M50 10l8 12H42z" stroke="${detail}" stroke-width="3"/>`;
  if(t==="k") body = `<path d="M45 7h10v9h9v8H36v-8h9z"/><path d="M25 27h50l-5 11H30z"/><path d="M31 39h38l-5 29H36z"/><path d="M20 70h60v10H20z"/><path d="M50 9v15" stroke="${detail}" stroke-width="3"/>`;
  if(t==="p") body = `<ellipse cx="50" cy="29" rx="16" ry="14"/><path d="M36 40c0 7 6 10 14 10s14-3 14-10l8 18H28z"/><path d="M22 70h56v10H22z"/><path d="M31 58h38" stroke="${detail}" stroke-width="3"/>`;

  return `<svg viewBox="0 0 100 90" aria-label="${NAMES[t]}" xmlns="http://www.w3.org/2000/svg">
    <g fill="${fill}" stroke="${stroke}" stroke-width="2.8" stroke-linejoin="round">${body}</g>
  </svg>`;
}

function render(){
  boardEl.innerHTML = "";
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq = document.createElement("button");
      sq.type = "button";
      sq.className = "sq " + ((r+c)%2 ? "dark" : "light");
      if(lastMove && (same(lastMove.from,{r,c}) || same(lastMove.to,{r,c}))) sq.classList.add("last");
      if(selected && same(selected,{r,c})) sq.classList.add("selected");

      const isTarget = targets.some(x => same(x,{r,c}));
      if(isTarget) sq.classList.add(board[r][c] ? "capture" : "target");

      const p = board[r][c];
      if(p){
        const piece = document.createElement("span");
        piece.className = "piece";
        piece.innerHTML = pieceSvg(p);
        sq.appendChild(piece);
      }

      sq.addEventListener("click", () => clickSquare(r,c));
      boardEl.appendChild(sq);
    }
  }

  updateClocks();
  updateStatus();
}

function clickSquare(r,c){
  if(gameOver) return;

  const p = board[r][c];

  if(selected){
    const target = targets.find(x => x.r===r && x.c===c);
    if(target){
      makeMove(selected,target);
      return;
    }

    if(p && sideOf(p)===turn){
      selected = {r,c};
      targets = legalMoves(r,c,turn);
    }else{
      selected = null;
      targets = [];
    }
    render();
    return;
  }

  if(p && sideOf(p)===turn){
    selected = {r,c};
    targets = legalMoves(r,c,turn);
    render();
  }
}

function pseudoMoves(r,c,side,b=board, history=moveHistory, ignoreKingSafety=false){
  const p = b[r][c];
  if(!p || sideOf(p)!==side) return [];

  const t = typeOf(p);
  const out = [];
  const foe = enemy(side);

  const add = (rr,cc, captureOnly=false) => {
    if(!inside(rr,cc)) return;
    const q = b[rr][cc];
    if(!q){
      if(!captureOnly) out.push({r:rr,c:cc});
    }else if(sideOf(q)===foe && typeOf(q)!=="k"){
      out.push({r:rr,c:cc});
    }
  };

  const ray = (dr,dc) => {
    let rr=r+dr, cc=c+dc;
    while(inside(rr,cc)){
      const q=b[rr][cc];
      if(!q){ out.push({r:rr,c:cc}); }
      else{
        if(sideOf(q)===foe && typeOf(q)!=="k") out.push({r:rr,c:cc});
        break;
      }
      rr+=dr; cc+=dc;
    }
  };

  if(t==="r"){
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>ray(d[0],d[1]));
  }

  if(t==="n"){
    [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
      .forEach(d=>add(r+d[0],c+d[1]));
  }

  if(t==="b"){
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
    add(r+(side==="white"?-1:1),c);
  }

  if(t==="q"){
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
    const hasMoved = moved[side].has(squareKey(r,c));
    if(!hasMoved){
      const d=side==="white"?-1:1;
      if(inside(r+2*d,c) && !b[r+d][c] && !b[r+2*d][c]){
        out.push({r:r+2*d,c});
      }
    }
  }

  if(t==="k"){
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]
      .forEach(d=>add(r+d[0],c+d[1]));

    // Cambodian Ouk special first king move: knight jump.
    if(!moved[side].has(squareKey(r,c)) && !inCheck(b,side)){
      [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]
        .forEach(d=>{
          const rr=r+d[0],cc=c+d[1];
          if(!inside(rr,cc)) return;
          const q=b[rr][cc];
          // The special king jump may not capture.
          if(!q) out.push({r:rr,c:cc,special:true});
        });
    }
  }

  if(t==="p"){
    const d=side==="white"?-1:1;
    if(inside(r+d,c) && !b[r+d][c]) out.push({r:r+d,c});
    for(const dc of [-1,1]){
      const rr=r+d,cc=c+dc;
      if(inside(rr,cc) && b[rr][cc] && sideOf(b[rr][cc])===foe && typeOf(b[rr][cc])!=="k"){
        out.push({r:rr,c:cc});
      }
    }
  }

  return out;
}

function legalMoves(r,c,side){
  const moves = pseudoMoves(r,c,side);
  return moves.filter(to=>{
    const b=cloneBoard(board);
    const p=b[r][c];
    b[to.r][to.c]=p;
    b[r][c]=null;
    return !inCheck(b,side);
  });
}

function findKing(b,side){
  const wanted=side==="white"?"wk":"bk";
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    if(b[r][c]===wanted) return {r,c};
  }
  return null;
}

function clearRay(b,r,c,tr,tc){
  const sr=Math.sign(tr-r),sc=Math.sign(tc-c);
  let rr=r+sr,cc=c+sc;
  while(rr!==tr || cc!==tc){
    if(b[rr][cc]) return false;
    rr+=sr;cc+=sc;
  }
  return true;
}

function squareAttacked(b,target,bySide){
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p=b[r][c];
      if(!p || sideOf(p)!==bySide) continue;
      const t=typeOf(p);
      const dr=target.r-r,dc=target.c-c;

      if(t==="p"){
        const d=bySide==="white"?-1:1;
        if(dr===d && Math.abs(dc)===1) return true;
      }else if(t==="n"){
        if(Math.abs(dr)*Math.abs(dc)===2) return true;
      }else if(t==="k"){
        if(Math.max(Math.abs(dr),Math.abs(dc))===1) return true;
        // The special first king jump is not treated as a normal attack.
      }else if(t==="q"){
        if(Math.abs(dr)===1 && Math.abs(dc)===1) return true;
      }else if(t==="b"){
        const forward=bySide==="white"?-1:1;
        if((Math.abs(dr)===1 && Math.abs(dc)===1) || (dr===forward && dc===0)) return true;
      }else if(t==="r"){
        if((dr===0 || dc===0) && clearRay(b,r,c,target.r,target.c)) return true;
      }
    }
  }
  return false;
}

function inCheck(b,side){
  const k=findKing(b,side);
  return k ? squareAttacked(b,k,enemy(side)) : true;
}

function anyLegalMove(side){
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      if(board[r][c] && sideOf(board[r][c])===side && legalMoves(r,c,side).length){
        return true;
      }
    }
  }
  return false;
}

function makeMove(from,to){
  if(gameOver) return;

  const moving=board[from.r][from.c];
  const captured=board[to.r][to.c];
  const side=turn;

  board[to.r][to.c]=moving;
  board[from.r][from.c]=null;

  // Mark the actual origin square as moved.
  moved[side].add(squareKey(from.r,from.c));
  moveHistory.push({from,to,p:moving,captured});

  // Promotion: Trey becomes Neang when it reaches the opponent's 6th rank.
  if(typeOf(moving)==="p"){
    const promotionRow=side==="white"?2:5;
    if(to.r===promotionRow){
      board[to.r][to.c]=side==="white"?"wq":"bq";
    }
  }

  lastMove={from,to};
  selected=null;
  targets=[];
  turn=enemy(turn);

  const nextHasMoves=anyLegalMove(turn);
  const nextCheck=inCheck(board,turn);

  if(!nextHasMoves){
    gameOver=true;
    stopTimer();
    if(nextCheck){
      statusEl.textContent=`🏆 ${side==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះ — អុកមាត`;
    }else{
      statusEl.textContent="🤝 ស្មើ — គ្មានដំណើរស្របច្បាប់";
    }
  }

  render();
}

function squareKey(r,c){ return `${r},${c}`; }

function updateStatus(){
  if(gameOver) return;
  const check=inCheck(board,turn);
  statusEl.textContent=`វេន ${turn==="white"?"ភាគីស":"ភាគីខ្មៅ"}${check?" • អុក!":""}`;

  document.querySelectorAll(".player").forEach(el=>el.classList.remove("active"));
  const players=document.querySelectorAll(".player");
  if(players.length===2) players[turn==="black"?0:1].classList.add("active");
}

function formatTime(ms){
  const s=Math.max(0,Math.ceil(ms/1000));
  return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
}

function updateClocks(){
  whiteClockEl.textContent=formatTime(clocks.white);
  blackClockEl.textContent=formatTime(clocks.black);
}

function startTimer(){
  stopTimer();
  lastTick=performance.now();
  timer=setInterval(()=>{
    if(gameOver) return;
    const now=performance.now();
    const dt=now-lastTick;
    lastTick=now;
    clocks[turn]-=dt;
    if(clocks[turn]<=0){
      clocks[turn]=0;
      gameOver=true;
      stopTimer();
      statusEl.textContent=`⏱️ ${turn==="white"?"ភាគីស":"ភាគីខ្មៅ"} អស់ពេល — ${turn==="white"?"ភាគីខ្មៅ":"ភាគីស"} ឈ្នះ`;
    }
    updateClocks();
  },100);
}

function stopTimer(){
  if(timer){ clearInterval(timer); timer=null; }
}

$("resetBtn").addEventListener("click",resetGame);
$("newGameBtn").addEventListener("click",resetGame);

$("helpBtn").addEventListener("click",()=>{
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
});
$("closeModal").addEventListener("click",()=>{
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
});
modal.addEventListener("click",e=>{
  if(e.target===modal){
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
  }
});

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden","true");
  }
});

resetGame();
