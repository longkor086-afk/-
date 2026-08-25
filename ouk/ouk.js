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
 const side=color(p), black=side==='black', fill=black?'#151515':'#f4f0e8', stroke=black?'#dedede':'#2f2a26';
 const hi=black?'#5e5e5e':'#ffffff', shade=black?'#070707':'#cfc7bb';
 const t=p.toUpperCase();
 let body='';
 if(t==='K') body=`<g><path d="M46 7h8v9h8v7h-8v5h13l5 8H28l5-8h13v-5h-8v-7h8z"/><path d="M30 36h40l-4 28H34z"/><path d="M23 64h54v12H23z"/><path d="M35 45h30M33 56h34" fill="none" stroke="${hi}" stroke-width="2" opacity=".45"/></g>`;
 if(t==='Q') body=`<g><path d="M25 24l6-13 10 10 9-15 9 15 10-10 6 13-7 10H32z"/><path d="M33 34h34l-4 29H37z"/><path d="M22 63h56v13H22z"/><path d="M34 43h32M32 54h36" fill="none" stroke="${hi}" stroke-width="2" opacity=".45"/></g>`;
 if(t==='B') body=`<g><path d="M50 8c-6 7-11 12-11 18 0 5 4 8 11 10 7-2 11-5 11-10 0-6-5-11-11-18z"/><path d="M34 34h32l7 10H27z"/><path d="M35 44h30l5 19H30z"/><path d="M21 63h58v13H21z"/><path d="M45 13l-5 12 10 7 10-7-5-12" fill="none" stroke="${hi}" stroke-width="2" opacity=".5"/></g>`;
 if(t==='N') body=`<g><path d="M31 63c-3-14 0-25 8-33l-5-12 12-10 14 8 12 1-4 10-12 3c9 6 14 17 11 33z"/><path d="M48 17l8 7-10 5M58 27l4 1" fill="none" stroke="${hi}" stroke-width="2.4"/><circle cx="61" cy="24" r="2" fill="${hi}"/><path d="M23 63h54v13H23z"/></g>`;
 if(t==='R') body=`<g><path d="M25 10h50v12l-6 6H31l-6-6z"/><path d="M32 28h36l-5 35H37z"/><path d="M21 63h58v13H21z"/><path d="M34 37h32M32 49h36M31 57h38" fill="none" stroke="${hi}" stroke-width="2" opacity=".5"/></g>`;
 if(t==='P') body=`<g><path d="M50 12c-10 0-16 7-16 16 0 7 4 12 10 15l-8 7 14 12 14-12-8-7c6-3 10-8 10-15 0-9-6-16-16-16z"/><path d="M37 50h26M29 63h42" fill="none" stroke="${hi}" stroke-width="2" opacity=".55"/></g>`;
 if(t==='T') body=`<g><path d="M50 10c-11 0-18 8-18 17 0 8 5 13 12 16l-7 6 13 10 13-10-7-6c7-3 12-8 12-16 0-9-7-17-18-17z"/><path d="M37 50h26M29 63h42" fill="none" stroke="${hi}" stroke-width="2" opacity=".55"/></g>`;
 return `<svg class="kh-piece-svg ${black?'black':'white'}" viewBox="0 0 100 82" role="img" aria-label="${INFO[t]}"><defs><linearGradient id="g${t}${black?'b':'w'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fill}"/><stop offset=".72" stop-color="${fill}"/><stop offset="1" stop-color="${shade}"/></linearGradient></defs><g fill="url(#g${t}${black?'b':'w'})" stroke="${stroke}" stroke-width="2.2" stroke-linejoin="round">${body}</g></svg>`;
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
