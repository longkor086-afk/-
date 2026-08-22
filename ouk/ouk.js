const SIZE = 8;
const INITIAL = [
  ['r','n','b','k','q','b','n','r'],
  Array(8).fill(null),
  Array(8).fill('p'),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill('P'),
  ['R','N','B','K','Q','B','N','R']
];

const PIECES = {
  K:{symbol:'♔',name:'ស្តេច',color:'white'}, Q:{symbol:'♕',name:'នាង',color:'white'}, B:{symbol:'♗',name:'គូល',color:'white'},
  N:{symbol:'♘',name:'សេះ',color:'white'}, R:{symbol:'♖',name:'ទូក',color:'white'}, P:{symbol:'♙',name:'ត្រី',color:'white'},
  k:{symbol:'♚',name:'ស្តេច',color:'black'}, q:{symbol:'♛',name:'នាង',color:'black'}, b:{symbol:'♝',name:'គូល',color:'black'},
  n:{symbol:'♞',name:'សេះ',color:'black'}, r:{symbol:'♜',name:'ទូក',color:'black'}, p:{symbol:'♟',name:'ត្រី',color:'black'}
};

let board = clone(INITIAL);
let turn = 'white';
let selected = null;
let legalTargets = [];
let lastMove = null;
let moveNumber = 1;
let gameOver = false;
let moveHistory = [];
let capturedAny = false;
let firstMove = {white:{K:false,Q:false}, black:{K:false,Q:false}};
let clocks = {white:180000, black:180000};
let increment = 2000;
let timerHandle = null;
let lastTick = performance.now();
let counting = null;

const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const historyEl = document.getElementById('history');
const whiteClock = document.getElementById('whiteClock');
const blackClock = document.getElementById('blackClock');
const turnLabel = document.getElementById('turnLabel');
const resetBtn = document.getElementById('resetBtn');
const helpBtn = document.getElementById('helpBtn');

function clone(x){ return x.map(r=>r.slice()); }
function colorOf(p){ return p ? (p===p.toUpperCase()?'white':'black') : null; }
function inside(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
function opponent(c){ return c==='white'?'black':'white'; }
function same(a,b){ return a&&b&&a.r===b.r&&a.c===b.c; }
function pieceAt(pos){ return board[pos.r][pos.c]; }
function posName(r,c){ return String.fromCharCode(97+c)+(8-r); }

function render(){
  boardEl.innerHTML='';
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const sq=document.createElement('button');
    sq.className='sq '+((r+c)%2?'dark':'light');
    sq.dataset.r=r; sq.dataset.c=c;
    const p=board[r][c];
    if(lastMove && (same(lastMove.from,{r,c})||same(lastMove.to,{r,c}))) sq.classList.add('last');
    if(selected && same(selected,{r,c})) sq.classList.add('selected');
    if(legalTargets.some(x=>same(x,{r,c}))) sq.classList.add(p?'capture':'target');
    if(p){
      const el=document.createElement('span');
      el.className='piece '+colorOf(p);
      el.textContent=PIECES[p].symbol;
      el.title=PIECES[p].name;
      sq.appendChild(el);
    }
    sq.addEventListener('click',()=>clickSquare(r,c));
    boardEl.appendChild(sq);
  }
  updateClocks(); updateStatus(); renderHistory();
}

function clickSquare(r,c){
  if(gameOver) return;
  const p=board[r][c];
  if(selected){
    const target=legalTargets.find(x=>x.r===r&&x.c===c);
    if(target){ makeMove(selected,target); return; }
  }
  if(p && colorOf(p)===turn){
    selected={r,c};
    legalTargets=legalMovesFor(r,c,true);
  } else { selected=null; legalTargets=[]; }
  render();
}

function makeMove(from,to){
  const p=board[from.r][from.c], captured=board[to.r][to.c];
  const color=turn;
  const wasCapture=!!captured;
  board[to.r][to.c]=p; board[from.r][from.c]=null;
  if((p==='P' && to.r===2) || (p==='p' && to.r===5)) board[to.r][to.c]=(p==='P'?'Q':'q');
  if(p==='K') firstMove.white.K=true;
  if(p==='k') firstMove.black.K=true;
  if(p==='Q') firstMove.white.Q=true;
  if(p==='q') firstMove.black.Q=true;
  if(wasCapture) capturedAny=true;
  clocks[color]=Math.max(0,clocks[color]+increment);
  lastMove={from,to};
  moveHistory.push({from,to,piece:p,captured,moveNo:moveNumber,color});
  if(color==='black') moveNumber++;
  selected=null; legalTargets=[];
  const movingColor=color;
  turn=opponent(turn);
  updateCountingAfterMove(wasCapture);
  const result=gameStatus(turn);
  if(result.over){ endGame(result.message); return; }
  render();
  startTimer();
}

function legalMovesFor(r,c,filterSelf=true){
  const p=board[r][c]; if(!p||colorOf(p)!==turn) return [];
  const pseudo=pseudoMoves(r,c);
  return pseudo.filter(to=>{
    const test=clone(board); applyBoardMove(test,{r,c},to);
    return !isKingInCheck(test,colorOf(p));
  });
}

function pseudoMoves(r,c){
  const p=board[r][c], color=colorOf(p), enemy=opponent(color), out=[];
  const add=(rr,cc,allowCapture=true)=>{ if(!inside(rr,cc))return; const q=board[rr][cc]; if(!q)out.push({r:rr,c:cc}); else if(colorOf(q)===enemy && q.toUpperCase()!=='K' && allowCapture)out.push({r:rr,c:cc}); };
  const ray=(dr,dc)=>{let rr=r+dr,cc=c+dc;while(inside(rr,cc)){const q=board[rr][cc];if(!q)out.push({r:rr,c:cc});else{if(colorOf(q)===enemy && q.toUpperCase()!=='K')out.push({r:rr,c:cc});break;}rr+=dr;cc+=dc;}};
  const P=p.toUpperCase();
  if(P==='R'){[[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>ray(...d));}
  else if(P==='N'){[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d=>add(r+d[0],c+d[1]));}
  else if(P==='B'){[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1])); add(r+(color==='white'?-1:1),c);}
  else if(P==='Q'){
    [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
    const forward=color==='white'?-1:1;
    // Cambodian special first move: two squares straight forward, only before any capture.
    if(!capturedAny && !firstMove[color].Q && inside(r+2*forward,c) && !board[r+forward][c] && !board[r+2*forward][c]) out.push({r:r+2*forward,c});
  }
  else if(P==='K'){
    [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
    // Cambodian first-move king knight jump. It is non-capturing and only before any capture.
    if(!capturedAny && !firstMove[color].K && !isKingInCheck(board,color)){
      [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(([dr,dc])=>{const rr=r+dr,cc=c+dc;if(inside(rr,cc)&&!board[rr][cc])out.push({r:rr,c:cc});});
    }
  }
  else if(P==='P'){
    const dir=color==='white'?-1:1;
    if(inside(r+dir,c)&&!board[r+dir][c]) out.push({r:r+dir,c});
    for(const dc of [-1,1]){const rr=r+dir,cc=c+dc;if(inside(rr,cc)&&board[rr][cc]&&board[rr][cc].toUpperCase()!=='K'&&colorOf(board[rr][cc])===enemy)out.push({r:rr,c:cc});}
  }
  return out;
}

function applyBoardMove(b,from,to){ b[to.r][to.c]=b[from.r][from.c]; b[from.r][from.c]=null; }

function findKing(b,color){
  const k=color==='white'?'K':'k';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===k)return {r,c};
  return null;
}
function isKingInCheck(b,color){
  const king=findKing(b,color); if(!king)return true;
  return squareAttacked(b,king,opponent(color));
}
function squareAttacked(b,target,byColor){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=b[r][c]; if(!p||colorOf(p)!==byColor)continue;
    const P=p.toUpperCase();
    if(P==='P'){
      const dir=byColor==='white'?-1:1;
      if(target.r===r+dir && Math.abs(target.c-c)===1)return true;
    } else if(P==='N'){
      if([[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].some(([dr,dc])=>target.r===r+dr&&target.c===c+dc))return true;
    } else if(P==='K'){
      if(Math.max(Math.abs(target.r-r),Math.abs(target.c-c))===1)return true;
    } else if(P==='B'||P==='Q'||P==='R'){
      const dirs=[];
      if(P==='B'||P==='Q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
      if(P==='R'||P==='Q') dirs.push([1,0],[-1,0],[0,1],[0,-1]);
      // Q in Ouk is only one diagonal step, not a slider. Override here.
      if(P==='Q'){
        if(Math.abs(target.r-r)===1&&Math.abs(target.c-c)===1)return true;
        // Special first move is a jump straight forward only before any capture;
        // it is not treated as an attack for check detection.
        continue;
      }
      if(P==='B' && target.r===r+(byColor==='white'?-1:1) && target.c===c) return true;
      for(const [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(inside(rr,cc)){if(rr===target.r&&cc===target.c)return true;if(b[rr][cc])break;rr+=dr;cc+=dc;}}
    }
  }
  return false;
}

function gameStatus(colorToMove){
  const hasMove=anyLegalMove(colorToMove);
  const inCheck=isKingInCheck(board,colorToMove);
  if(!hasMove && inCheck)return {over:true,message:`♔ ${colorToMove==='white'?'ភាគីស':'ភាគីខ្មៅ'} ចាញ់ — Checkmate`};
  if(!hasMove)return {over:true,message:'ស្មើ — Stalemate'};
  if(counting && counting.moveCount>=counting.limit)return {over:true,message:'ស្មើ — ដល់កម្រិតរាប់ចុងហ្គេម'};
  return {over:false};
}
function anyLegalMove(color){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=board[r][c];if(p&&colorOf(p)===color){const pseudo=legalMovesForColor(r,c,color);if(pseudo.length)return true;}}
  return false;
}
function legalMovesForColor(r,c,color){
  const old=turn; turn=color; const m=legalMovesFor(r,c); turn=old; return m;
}

function updateCountingAfterMove(wasCapture){
  // Start the traditional 64-move no-unpromoted-pawn count when no Trey remains.
  const noPawns=!board.flat().some(p=>p&&p.toUpperCase()==='P');
  if(noPawns && !counting){ counting={mode:'pawnless',moveCount:0,limit:64}; }
  if(counting){
    if(wasCapture && counting.mode==='pawnless') counting.moveCount=0;
    else counting.moveCount++;
  }
  // If one side is reduced to a bare king, use the piece-honor limit.
  for(const c of ['white','black']){
    const pieces=board.flat().filter(p=>p&&colorOf(p)===c);
    if(pieces.length===1 && pieces[0].toUpperCase()==='K'){
      const limit=materialLimit(opponent(c));
      if(limit){ counting={mode:'piece-honor',moveCount:0,limit}; break; }
    }
  }
}
function materialLimit(stronger){
  const pieces=board.flat().filter(p=>p&&colorOf(p)===stronger).map(p=>p.toUpperCase());
  const r=pieces.filter(x=>x==='R').length, b=pieces.filter(x=>x==='B').length, n=pieces.filter(x=>x==='N').length;
  if(r>=2)return 8;if(r>=1)return 16;if(b>=2)return 22;if(n>=2)return 32;if(b>=1)return 44;if(n>=1)return 64;
  if(pieces.every(x=>x==='Q'||x==='K'))return 64;
  return null;
}

function endGame(msg){ gameOver=true; stopTimer(); statusEl.textContent=msg; render(); }

function startTimer(){
  stopTimer(); lastTick=performance.now();
  timerHandle=setInterval(()=>{
    const now=performance.now(); const dt=now-lastTick; lastTick=now;
    clocks[turn]-=dt;
    if(clocks[turn]<=0){clocks[turn]=0;endGame(`⏱️ ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'} អស់ពេល`);return;}
    updateClocks();
  },100);
}
function stopTimer(){if(timerHandle){clearInterval(timerHandle);timerHandle=null;}}
function fmt(ms){const total=Math.ceil(ms/1000);return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');}
function updateClocks(){whiteClock.textContent=fmt(clocks.white);blackClock.textContent=fmt(clocks.black);whiteClock.parentElement.classList.toggle('active',turn==='white'&&!gameOver);blackClock.parentElement.classList.toggle('active',turn==='black'&&!gameOver);}
function updateStatus(){
  const check=isKingInCheck(board,turn);
  turnLabel.textContent=gameOver?'ហ្គេមបានបញ្ចប់':`វេន ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'}${check?' • អុក!':''}`;
  if(!gameOver)statusEl.textContent=check?`⚠️ ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'} កំពុងត្រូវអុក`:'ជ្រើសកូនមួយដើម្បីដើរ';
}
function renderHistory(){
  historyEl.innerHTML=moveHistory.slice(-10).map(m=>`<div>${m.moveNo}. ${m.color==='white'?'ស':'ខ'} ${PIECES[m.piece].name} ${posName(m.from.r,m.from.c)}→${posName(m.to.r,m.to.c)}${m.captured?' ×':''}</div>`).join('');
}
function resetGame(){
  stopTimer(); board=clone(INITIAL);turn='white';selected=null;legalTargets=[];lastMove=null;moveNumber=1;gameOver=false;moveHistory=[];capturedAny=false;firstMove={white:{K:false,Q:false},black:{K:false,Q:false}};clocks={white:180000,black:180000};counting=null;render();startTimer();
}
function showHelp(){
  alert(`អុកខ្មែរ (Ouk Chatrang)\n\n• ក្តារ 8×8\n• ត្រី៖ ទៅមុខ 1 ក្រឡា និងចាប់អង្កត់ទ្រូង; មិនមាន double-step/en passant; ឡើងជា នាង នៅជួរទី 6\n• នាង៖ អង្កត់ទ្រូង 1 ក្រឡា; ដំណើរដំបូងអាចទៅមុខ 2 ក្រឡា ប្រសិនបើមិនទាន់មានការចាប់កូន\n• គូល៖ អង្កត់ទ្រូង 1 ក្រឡា ឬទៅមុខ 1\n• សេះ៖ ដើរដូច Knight\n• ទូក៖ ដើរត្រង់បានច្រើនក្រឡា\n• ស្តេច៖ 1 ក្រឡាគ្រប់ទិស; ដំណើរដំបូងអាចលោតដូចសេះ បើមិននៅក្នុងអុក និងមិនទាន់មានការចាប់កូន\n• មិនមាន Castling\n• Checkmate = ឈ្នះ; Stalemate = ស្មើ\n• មានការរាប់ចុងហ្គេមសម្រាប់ស្ថានភាពគ្មានត្រី/ស្តេចទទេ`);
}
resetBtn.addEventListener('click',resetGame); helpBtn.addEventListener('click',showHelp); render(); startTimer();
