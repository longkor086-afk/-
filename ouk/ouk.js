const SIZE=8;
const INITIAL=[
 ['r','n','b','k','q','b','n','r'],
 Array(8).fill(null),Array(8).fill('p'),
 Array(8).fill(null),Array(8).fill(null),Array(8).fill(null),
 Array(8).fill('P'),['R','N','B','K','Q','B','N','R']
];
const INFO={K:'ស្តេច',Q:'នាង',B:'គូល',N:'សេះ',R:'ទូក',P:'ត្រី',T:'ត្រីបក'};
let board=INITIAL.map(r=>r.slice()),turn='white',selected=null,targets=[],lastMove=null,gameOver=false;
let history=[],moveNo=1,capturedAny=false,used={white:{K:false,Q:false},black:{K:false,Q:false}};
let clocks={white:180000,black:180000},increment=2000,timer=null,lastTick=0;
const $=id=>document.getElementById(id);
const boardEl=$('board'),statusEl=$('status'),historyEl=$('history'),whiteClock=$('whiteClock'),blackClock=$('blackClock'),turnLabel=$('turnLabel');
const clone=b=>b.map(r=>r.slice()), inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const color=p=>p?(p===p.toUpperCase()?'white':'black'):null, opp=c=>c==='white'?'black':'white';
const same=(a,b)=>a&&b&&a.r===b.r&&a.c===b.c, pos=(r,c)=>String.fromCharCode(97+c)+(8-r);

// 2D Khmer-inspired vector pieces. No external fonts/assets required.
function pieceSVG(p){
 const side=color(p), dark=side==='black', main=dark?'#29231e':'#f8efd9', edge=dark?'#d49a52':'#6a3d20', accent=dark?'#a86a32':'#c48a43';
 const t=p.toUpperCase();
 let body='';
 if(t==='K') body=`<path d="M50 7l5 8h8l-4 7h-18l-4-7h8z"/><path d="M24 27h52l-5 9H29zM29 38h42l-4 30H33z"/><path d="M20 70h60v9H20z"/><path d="M35 46h30M32 58h36" stroke="${accent}" stroke-width="3" fill="none"/>`;
 if(t==='Q') body=`<path d="M23 28h54l-7 9H30z"/><path d="M31 38h38l-5 30H36z"/><path d="M22 70h56v9H22z"/><path d="M31 27l5-14 9 10 5-16 5 16 9-10 5 14" fill="none" stroke="${accent}" stroke-width="4" stroke-linejoin="round"/>`;
 if(t==='B') body=`<path d="M50 9l12 15-5 7H43l-5-7z"/><path d="M35 31h30l7 11H28z"/><path d="M34 43h32l5 25H29z"/><path d="M20 70h60v9H20z"/><path d="M50 12v15" stroke="${accent}" stroke-width="3"/>`;
 if(t==='N') body=`<path d="M30 69c-2-17 1-29 12-36l-5-13 10-9 13 9 10 1-4 9-9 2c10 7 15 19 11 37z"/><path d="M48 20l7 6-9 4" fill="none" stroke="${accent}" stroke-width="3"/><circle cx="58" cy="24" r="2.5" fill="${accent}"/><path d="M25 70h50v9H25z"/>`;
 if(t==='R') body=`<path d="M26 14h48v11l-6 6H32l-6-6z"/><path d="M32 32h36l-5 36H37z"/><path d="M20 70h60v9H20z"/><path d="M34 39h32M32 50h36M31 61h38" stroke="${accent}" stroke-width="3"/>`;
 if(t==='P') body=`<path d="M50 12c-12 0-19 8-19 18 0 7 4 12 10 15l-9 9 18 13 18-13-9-9c6-3 10-8 10-15 0-10-7-18-19-18z"/><path d="M37 55h26M30 70h40" stroke="${accent}" stroke-width="3"/>`;
 if(t==='T') body=`<path d="M50 18c-10 4-18 12-16 21 2 7 9 10 17 10 8 0 15-3 17-10 2-9-6-17-18-21z"/><path d="M34 50l-15 9 16 4 7 10h16l7-10 16-4-15-9"/><path d="M31 74h38" stroke="${accent}" stroke-width="4"/>`;
 return `<svg class="kh-piece-svg ${dark?'black':'white'}" viewBox="0 0 100 90" aria-label="${INFO[t]}"><g fill="${main}" stroke="${edge}" stroke-width="2.5" stroke-linejoin="round">${body}</g></svg>`;
}

function render(){
 boardEl.innerHTML='';
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const s=document.createElement('button');s.className='sq '+((r+c)%2?'dark':'light');
  if(lastMove&&(same(lastMove.from,{r,c})||same(lastMove.to,{r,c})))s.classList.add('last');
  if(selected&&same(selected,{r,c}))s.classList.add('selected');
  if(targets.some(x=>same(x,{r,c})))s.classList.add(board[r][c]?'capture':'target');
  const p=board[r][c]; if(p){const e=document.createElement('span');e.className='piece';e.innerHTML=pieceSVG(p);s.appendChild(e);}
  s.onclick=()=>clickSquare(r,c);boardEl.appendChild(s);
 }
 updateClocks();updateStatus();renderHistory();
}
function clickSquare(r,c){
 if(gameOver)return; const p=board[r][c];
 if(selected){const t=targets.find(x=>x.r===r&&x.c===c);if(t){makeMove(selected,t);return;}}
 if(p&&color(p)===turn){selected={r,c};targets=legal(r,c,turn);}else{selected=null;targets=[];}render();
}
function animateMove(from,to,cb){
 const cells=boardEl.querySelectorAll('.sq');
 const src=cells[from.r*8+from.c],dst=cells[to.r*8+to.c];
 const moving=src?.querySelector('.piece');
 if(!src||!dst||!moving){cb();return;}
 const a=src.getBoundingClientRect(),b=dst.getBoundingClientRect();
 const ghost=document.createElement('div');ghost.className='move-piece';
 ghost.style.left=a.left+'px';ghost.style.top=a.top+'px';ghost.style.width=a.width+'px';ghost.style.height=a.height+'px';
 ghost.innerHTML=moving.innerHTML;document.body.appendChild(ghost);moving.style.visibility='hidden';
 const dx=b.left-a.left,dy=b.top-a.top,start=performance.now(),dur=300;
 function frame(now){
  const t=Math.min(1,(now-start)/dur),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  const lift=-Math.sin(Math.PI*t)*Math.min(a.height*.22,18);
  ghost.style.transform=`translate(${dx*e}px,${dy*e+lift}px) scale(${1+.05*Math.sin(Math.PI*t)})`;
  if(t<1)requestAnimationFrame(frame);else{ghost.remove();cb();}
 }
 requestAnimationFrame(frame);
}
function makeMove(from,to){
 const p=board[from.r][from.c],cap=board[to.r][to.c],side=turn;
 animateMove(from,to,()=>{
  board[to.r][to.c]=p;board[from.r][from.c]=null;
  if(p==='P'&&to.r===2)board[to.r][to.c]='T';
  if(p==='p'&&to.r===5)board[to.r][to.c]='t';
  if(p==='K'||p==='k')used[side].K=true;if(p==='Q'||p==='q')used[side].Q=true;
  if(cap)capturedAny=true;
  clocks[side]=Math.min(180000,clocks[side]+increment);
  history.push({from,to,p,cap,side,no:moveNo});if(side==='black')moveNo++;
  lastMove={from,to};selected=null;targets=[];turn=opp(turn);
  const st=status(turn);if(st.over){end(st.msg);return;}render();
  const landed=boardEl.querySelectorAll('.sq')[to.r*8+to.c]?.querySelector('.piece');
  if(landed){landed.classList.add('move-land');setTimeout(()=>landed.classList.remove('move-land'),220);}
  startTimer();
 });
}
function legal(r,c,side){
 const p=board[r][c];if(!p||color(p)!==side)return[];
 return pseudo(r,c).filter(to=>{const b=clone(board);b[to.r][to.c]=b[r][c];b[r][c]=null;return !inCheck(b,side);});
}
function pseudo(r,c){
 const p=board[r][c],side=color(p),enemy=opp(side),out=[],P=p.toUpperCase();
 const add=(rr,cc,canCapture=true)=>{if(!inside(rr,cc))return;const q=board[rr][cc];if(!q)out.push({r:rr,c:cc});else if(color(q)===enemy&&q.toUpperCase()!=='K'&&canCapture)out.push({r:rr,c:cc});};
 const ray=(dr,dc)=>{let rr=r+dr,cc=c+dc;while(inside(rr,cc)){const q=board[rr][cc];if(!q)out.push({r:rr,c:cc});else{if(color(q)===enemy&&q.toUpperCase()!=='K')out.push({r:rr,c:cc});break;}rr+=dr;cc+=dc;}};
 if(P==='R')[[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>ray(...d));
 else if(P==='N')[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d=>add(r+d[0],c+d[1]));
 else if(P==='B'){[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));add(r+(side==='white'?-1:1),c);}
 else if(P==='Q'||P==='T'){
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
  if(P==='Q'&&!capturedAny&&!used[side].Q){const f=side==='white'?-1:1;if(inside(r+2*f,c)&&!board[r+f][c]&&!board[r+2*f][c])out.push({r:r+2*f,c});}
 }
 else if(P==='K'){
  [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
  if(!capturedAny&&!used[side].K&&!inCheck(board,side)){
   // Khmer opening king jump: knight move on first move; capture is allowed.
   [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d=>add(r+d[0],c+d[1]));
  }
 }
 else if(P==='P'){
  const d=side==='white'?-1:1;if(inside(r+d,c)&&!board[r+d][c])out.push({r:r+d,c});
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
  else if((P==='Q'||P==='T')&&Math.abs(dr)===1&&Math.abs(dc)===1)return true;
  else if(P==='B'){if(Math.abs(dr)===1&&Math.abs(dc)===1)return true;if(dc===0&&dr===(by==='white'?-1:1))return true;}
  else if(P==='R'&&(dr===0||dc===0)){
   const sr=Math.sign(dr),sc=Math.sign(dc);let rr=r+sr,cc=c+sc,clear=true;while(rr!==t.r||cc!==t.c){if(b[rr][cc]){clear=false;break;}rr+=sr;cc+=sc;}if(clear)return true;
  }
 }
 return false;
}
function anyMove(side){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]&&color(board[r][c])===side&&legal(r,c,side).length)return true;return false;}
function status(side){const check=inCheck(board,side),has=anyMove(side);if(!has&&check)return{over:true,msg:`♔ ${side==='white'?'ភាគីស':'ភាគីខ្មៅ'} ចាញ់ — អុកមាត`};if(!has)return{over:true,msg:'ស្មើ — គ្មានដំណើរស្របច្បាប់'};return{over:false};}
function updateStatus(){if(gameOver)return;const check=inCheck(board,turn);turnLabel.textContent=`វេន ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'}${check?' • អុក!':''}`;statusEl.textContent=check?'អុក! ត្រូវដោះអុកមុនធ្វើដំណើរ':'ជ្រើសកូនមួយដើម្បីដើរ';}
function renderHistory(){historyEl.innerHTML=history.slice(-24).map(m=>`<div>${m.no}${m.side==='white'?'.':'...'} ${INFO[m.p.toUpperCase()]} ${pos(m.from.r,m.from.c)}→${pos(m.to.r,m.to.c)}${m.cap?' ×':''}</div>`).join('');}
function end(msg){gameOver=true;stopTimer();statusEl.textContent=msg;render();}
function startTimer(){stopTimer();lastTick=performance.now();timer=setInterval(()=>{const now=performance.now(),dt=now-lastTick;lastTick=now;clocks[turn]-=dt;if(clocks[turn]<=0){clocks[turn]=0;end(`⏱️ ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'} អស់ពេល`);}else updateClocks();},100);}
function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
function fmt(ms){const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function updateClocks(){whiteClock.textContent=fmt(clocks.white);blackClock.textContent=fmt(clocks.black);whiteClock.parentElement.classList.toggle('active',turn==='white'&&!gameOver);blackClock.parentElement.classList.toggle('active',turn==='black'&&!gameOver);}
$('resetBtn').onclick=()=>{stopTimer();board=INITIAL.map(r=>r.slice());turn='white';selected=null;targets=[];lastMove=null;gameOver=false;history=[];moveNo=1;capturedAny=false;used={white:{K:false,Q:false},black:{K:false,Q:false}};clocks={white:180000,black:180000};render();startTimer();};
$('helpBtn').onclick=()=>alert('អុកចត្រង្គខ្មែរ\n• ត្រីដើរ ១ និងចាប់អង្កត់ទ្រូង ១; មិនមាន double-step/en passant។\n• ត្រីដល់ជួរទី ៦ (សម្រាប់ស) ឬជួរទី ៣ (សម្រាប់ខ្មៅ) បកជា ត្រីបក ហើយដើរដូច នាង។\n• នាងដើរអង្កត់ទ្រូង ១; ដំបូងអាចលោតត្រង់ ២ ក្រឡា ប្រសិនបើមិនទាន់មានការចាប់។\n• គូលដើរអង្កត់ទ្រូង ១ ឬទៅមុខ ១។\n• សេះដើរដូចសេះអុកសកល។\n• ទូកដើរត្រង់គ្រប់ចំនួនក្រឡា។\n• ស្តេចដើរ ១; ដំណើរដំបូងអាចលោតដូចសេះ ប្រសិនបើមិនទាន់មានការចាប់ និងមិនកំពុងអុក។\n• ឈ្នះដោយអុកមាតស្តេច។');
render();startTimer();
