
const SIZE=8;
const INITIAL=[
 ['r','n','b','k','q','b','n','r'],
 Array(8).fill(null),Array(8).fill('p'),
 Array(8).fill(null),Array(8).fill(null),Array(8).fill(null),
 Array(8).fill('P'),['R','N','B','K','Q','B','N','R']
];
const PIECES={
 K:{s:'♔',n:'ស្តេច'},Q:{s:'♕',n:'នាង'},B:{s:'♗',n:'គូល'},N:{s:'♘',n:'សេះ'},R:{s:'♖',n:'ទូក'},P:{s:'♙',n:'ត្រី'},
 k:{s:'♚',n:'ស្តេច'},q:{s:'♛',n:'នាង'},b:{s:'♝',n:'គូល'},n:{s:'♞',n:'សេះ'},r:{s:'♜',n:'ទូក'},p:{s:'♟',n:'ត្រី'}
};
let board=INITIAL.map(r=>r.slice()),turn='white',selected=null,targets=[],lastMove=null,gameOver=false;
let history=[],moveNo=1,capturedAny=false;
let specialUsed={white:{K:false,Q:false},black:{K:false,Q:false}};
let clocks={white:180000,black:180000},increment=2000,timer=null,lastTick=0;
let count=null;

const $=id=>document.getElementById(id);
const boardEl=$('board'),statusEl=$('status'),historyEl=$('history'),whiteClock=$('whiteClock'),blackClock=$('blackClock'),turnLabel=$('turnLabel');
const clone=b=>b.map(r=>r.slice()), inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const color=p=>p?(p===p.toUpperCase()?'white':'black'):null, opp=c=>c==='white'?'black':'white';
const same=(a,b)=>a&&b&&a.r===b.r&&a.c===b.c;
const name=(r,c)=>String.fromCharCode(97+c)+(8-r);

function render(){
 boardEl.innerHTML='';
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const s=document.createElement('button');s.className='sq '+((r+c)%2?'dark':'light');
  if(lastMove&&(same(lastMove.from,{r,c})||same(lastMove.to,{r,c})))s.classList.add('last');
  if(selected&&same(selected,{r,c}))s.classList.add('selected');
  if(targets.some(x=>same(x,{r,c})))s.classList.add(board[r][c]?'capture':'target');
  if(board[r][c]){
   const e=document.createElement('span');e.className='piece '+color(board[r][c]);e.textContent=PIECES[board[r][c]].s;s.appendChild(e);
  }
  s.onclick=()=>click(r,c);boardEl.appendChild(s);
 }
 updateClocks();renderHistory();updateStatus();
}
function click(r,c){
 if(gameOver)return;
 if(selected){
  const t=targets.find(x=>x.r===r&&x.c===c);
  if(t){move(selected,t);return;}
 }
 if(board[r][c]&&color(board[r][c])===turn){selected={r,c};targets=legal(r,c,turn);}
 else{selected=null;targets=[];}
 render();
}
function move(from,to){
 const p=board[from.r][from.c],cap=board[to.r][to.c],side=turn;
 board[to.r][to.c]=p;board[from.r][from.c]=null;
 if(p==='P'&&to.r===2)board[to.r][to.c]='Q';
 if(p==='p'&&to.r===5)board[to.r][to.c]='q';
 specialUsed[side][p.toUpperCase()]=true;
 if(cap)capturedAny=true;
 clocks[side]=Math.min(180000,clocks[side]+increment);
 history.push({from,to,p,cap,side,no:moveNo});if(side==='black')moveNo++;
 lastMove={from,to};selected=null;targets=[];turn=opp(turn);
 updateCount(cap);
 const st=status(turn);if(st.over){end(st.msg);return;}
 render();startTimer();
}
function legal(r,c,side){
 const p=board[r][c];if(!p||color(p)!==side)return[];
 return pseudo(r,c).filter(to=>{const b=clone(board);b[to.r][to.c]=b[r][c];b[r][c]=null;return !inCheck(b,side);});
}
function pseudo(r,c){
 const p=board[r][c],side=color(p),enemy=opp(side),out=[],P=p.toUpperCase();
 const add=(rr,cc,capture=true)=>{if(!inside(rr,cc))return;const q=board[rr][cc];if(!q)out.push({r:rr,c:cc});else if(color(q)===enemy&&q.toUpperCase()!=='K'&&capture)out.push({r:rr,c:cc});};
 const ray=(dr,dc)=>{let rr=r+dr,cc=c+dc;while(inside(rr,cc)){const q=board[rr][cc];if(!q)out.push({r:rr,c:cc});else{if(color(q)===enemy&&q.toUpperCase()!=='K')out.push({r:rr,c:cc});break;}rr+=dr;cc+=dc;}};
 if(P==='R')[[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>ray(...d));
 else if(P==='N')[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d=>add(r+d[0],c+d[1]));
 else if(P==='B'){[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));add(r+(side==='white'?-1:1),c);}
 else if(P==='Q'){
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
  const start=side==='white'?7:0,forward=side==='white'?-1:1;
  if(!capturedAny&&!specialUsed[side].Q&&r===start&&!board[r+forward][c]&&!board[r+2*forward][c])out.push({r:r+2*forward,c});
 }
 else if(P==='K'){
  [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
  const start=side==='white'?7:0,forward=side==='white'?-1:1;
  if(!capturedAny&&!specialUsed[side].K&&r===start&&!inCheck(board,side)){
   for(const dc of [-1,1]){const rr=r+2*forward,cc=c+dc;if(inside(rr,cc)&&!board[rr][cc])out.push({r:rr,c:cc});}
  }
 }
 else if(P==='P'){
  const d=side==='white'?-1:1;
  if(inside(r+d,c)&&!board[r+d][c])out.push({r:r+d,c});
  for(const dc of [-1,1]){const rr=r+d,cc=c+dc;if(inside(rr,cc)&&board[rr][cc]&&color(board[rr][cc])===enemy&&board[rr][cc].toUpperCase()!=='K')out.push({r:rr,c:cc});}
 }
 return out;
}
function findKing(b,side){const k=side==='white'?'K':'k';for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===k)return{r,c};return null;}
function inCheck(b,side){const k=findKing(b,side);return !k||attacked(b,k,opp(side));}
function attacked(b,t,by){
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const p=b[r][c];if(!p||color(p)!==by)continue;const P=p.toUpperCase(),dr=t.r-r,dc=t.c-c;
  if(P==='P'){const d=by==='white'?-1:1;if(dr===d&&Math.abs(dc)===1)return true;}
  else if(P==='N'&&Math.abs(dr)*Math.abs(dc)===2)return true;
  else if(P==='K'&&Math.max(Math.abs(dr),Math.abs(dc))===1)return true;
  else if(P==='Q'&&Math.abs(dr)===1&&Math.abs(dc)===1)return true;
  else if(P==='B'){
   if(Math.abs(dr)===1&&Math.abs(dc)===1)return true;
   if(dc===0&&dr===(by==='white'?-1:1))return true;
  }else if(P==='R'){
   if(dr===0||dc===0){const sr=Math.sign(dr),sc=Math.sign(dc);let rr=r+sr,cc=c+sc,clear=true;while(rr!==t.r||cc!==t.c){if(b[rr][cc]){clear=false;break;}rr+=sr;cc+=sc;}if(clear)return true;}
  }
 }
 return false;
}
function anyMove(side){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]&&color(board[r][c])===side&&legal(r,c,side).length)return true;return false;}
function status(side){const check=inCheck(board,side),has=anyMove(side);if(!has&&check)return{over:true,msg:`♔ ${side==='white'?'ភាគីស':'ភាគីខ្មៅ'} ចាញ់ — អុក`};if(!has)return{over:true,msg:'ស្មើ — អស់ដំណើរ'};if(count&&count.n>=count.limit)return{over:true,msg:'ស្មើ — ដល់កំណត់រាប់'};return{over:false};}
function updateCount(cap){
 // Board-honor: when one side has <=3 pieces, the weaker side may start a 64-count.
 const pieces={white:board.flat().filter(p=>p&&color(p)==='white').length,black:board.flat().filter(p=>p&&color(p)==='black').length};
 const weak=pieces.white<=3?'white':pieces.black<=3?'black':null;
 if(weak&&!count)count={type:'board',n:0,limit:64,side:weak};
 if(count){if(cap)count.n=0;else count.n++;}
 // Piece-honor starts only with no unpromoted pawns and a bare king.
 if(!board.flat().some(p=>p&&p.toUpperCase()==='P')){
  for(const s of ['white','black'])if(board.flat().filter(p=>p&&color(p)===s).length===1){
   const stronger=opp(s),limit=pieceLimit(stronger);
   if(limit&&!count)count={type:'piece',n:2,limit,side:s};
  }
 }
}
function pieceLimit(side){
 const a=board.flat().filter(p=>p&&color(p)===side).map(p=>p.toUpperCase());
 const r=a.filter(x=>x==='R').length,b=a.filter(x=>x==='B').length,n=a.filter(x=>x==='N').length;
 if(r>=2)return 8;if(r>=1)return 16;if(b>=2)return 22;if(n>=2)return 32;if(b>=1)return 44;if(n>=1)return 64;
 if(a.every(x=>x==='Q'||x==='K'))return 64;return null;
}
function updateStatus(){
 const check=inCheck(board,turn);
 if(gameOver)return;
 turnLabel.textContent=`វេន ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'}${check?' • អុក!':''}`;
 statusEl.textContent=count?`រាប់ ${count.n}/${count.limit} • ${count.side==='white'?'ភាគីស':'ភាគីខ្មៅ'} រាប់`:(check?'អុក! ជ្រើសដំណើរដើម្បីគេច':'ជ្រើសកូនមួយដើម្បីដើរ');
}
function renderHistory(){historyEl.innerHTML=history.slice(-20).map((m,i)=>`<div>${m.no}${m.side==='white'?'.':'...'} ${PIECES[m.p].n} ${name(m.from.r,m.from.c)}→${name(m.to.r,m.to.c)}${m.cap?' ×':''}</div>`).join('');}
function end(msg){gameOver=true;stopTimer();statusEl.textContent=msg;render();}
function startTimer(){stopTimer();lastTick=performance.now();timer=setInterval(()=>{const now=performance.now(),dt=now-lastTick;lastTick=now;clocks[turn]-=dt;if(clocks[turn]<=0){clocks[turn]=0;end(`⏱️ ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'} អស់ពេល`);}else updateClocks();},100);}
function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
function updateClocks(){whiteClock.textContent=fmt(clocks.white);blackClock.textContent=fmt(clocks.black);whiteClock.parentElement.classList.toggle('active',turn==='white'&&!gameOver);blackClock.parentElement.classList.toggle('active',turn==='black'&&!gameOver);}
function fmt(ms){const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
$('resetBtn').onclick=()=>{stopTimer();board=INITIAL.map(r=>r.slice());turn='white';selected=null;targets=[];lastMove=null;gameOver=false;history=[];moveNo=1;capturedAny=false;specialUsed={white:{K:false,Q:false},black:{K:false,Q:false}};clocks={white:180000,black:180000};count=null;render();startTimer();};
$('helpBtn').onclick=()=>alert('អុកខ្មែរ (Ouk Chatrang)\\n• ត្រីដើរ/ចាប់ដូចត្រីអុក ប៉ុន្តែមិនមាន double-step។\\n• នាងដើរអង្កត់ទ្រូង ១ ក្រឡា។\\n• គូលដើរអង្កត់ទ្រូង ១ ឬទៅមុខ ១។\\n• សេះដើរដូចអុកសកល។\\n• ស្តេចដើរ ១ ក្រឡា។\\n• ដំណើរពិសេសដំបូងរបស់ស្តេច/នាងត្រូវបានអនុវត្តតាមក្បួនអុកខ្មែរ។');
render();startTimer();
