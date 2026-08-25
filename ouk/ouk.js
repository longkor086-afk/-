const SIZE=8;
const INITIAL=[
 ['r','n','b','q','k','b','n','r'],
 Array(8).fill(null),Array(8).fill('p'),Array(8).fill(null),Array(8).fill(null),Array(8).fill(null),
 Array(8).fill('P'),['R','N','B','Q','K','B','N','R']
];
const INFO={K:'ស្តេច',Q:'នាង',B:'គូល',N:'សេះ',R:'ទូក',P:'ត្រី'};
let board=INITIAL.map(r=>r.slice()),turn='white',selected=null,targets=[],lastMove=null,gameOver=false;
let history=[],clocks={white:180000,black:180000},increment=2000,timer=null,lastTick=0;
const $=id=>document.getElementById(id),boardEl=$('board'),statusEl=$('status'),turnLabel=$('turnLabel');
const whiteClock=$('whiteClock'),blackClock=$('blackClock'),whiteTop=$('whiteClockTop'),blackTop=$('blackClockTop');
const color=p=>p?(p===p.toUpperCase()?'white':'black'):null,opp=c=>c==='white'?'black':'white';
const same=(a,b)=>a&&b&&a.r===b.r&&a.c===b.c;
const pos=(r,c)=>String.fromCharCode(97+c)+(8-r);
function esc(s){return s}
function pieceSVG(p){
 const side=color(p),dark=side==='black', fill=dark?'#17191b':'#f7f4ec', stroke=dark?'#050505':'#9a9a9a', line=dark?'#8b8b8b':'#7a6b58', t=p.toUpperCase();
 let body='';
 // Each piece is intentionally unique: knight ≠ bishop, rook ≠ king/queen.
 if(t==='R') body=`<path d="M25 13h50v12l-6 7H31l-6-7z"/><path d="M31 32h38l-5 36H36z"/><path d="M20 70h60v10H20z"/><path d="M34 39h32M32 50h36M31 61h38" fill="none" stroke="${line}" stroke-width="3"/>`;
 if(t==='N') body=`<path d="M28 69c-2-16 2-29 13-36l-5-13 11-10 14 9 10 1-4 10-10 2c10 8 14 19 10 37z"/><path d="M48 21l8 6-10 4" fill="none" stroke="${line}" stroke-width="3"/><circle cx="58" cy="24" r="2.7" fill="${line}"/><path d="M24 70h52v10H24z"/>`;
 if(t==='B') body=`<path d="M50 9l12 15-5 8H43l-5-8z"/><path d="M34 32h32l7 10H27z"/><path d="M34 43h32l5 25H29z"/><path d="M20 70h60v10H20z"/><path d="M50 12v16" stroke="${line}" stroke-width="3"/>`;
 if(t==='Q') body=`<path d="M22 27h56l-7 10H29z"/><path d="M31 38h38l-5 30H36z"/><path d="M21 70h58v10H21z"/><path d="M31 27l5-14 9 10 5-16 5 16 9-10 5 14" fill="none" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>`;
 if(t==='K') body=`<path d="M45 8h10v10h10v7H35v-7h10z"/><path d="M25 28h50l-5 10H30z"/><path d="M31 39h38l-5 29H36z"/><path d="M20 70h60v10H20z"/><path d="M50 9v16" stroke="${line}" stroke-width="3"/>`;
 if(t==='P') body=`<ellipse cx="50" cy="29" rx="16" ry="14"/><path d="M36 40c0 7 6 10 14 10s14-3 14-10l8 18H28z"/><path d="M22 70h56v10H22z"/><path d="M31 58h38" stroke="${line}" stroke-width="3"/>`;
 return `<svg viewBox="0 0 100 90" role="img" aria-label="${INFO[t]}" xmlns="http://www.w3.org/2000/svg"><g fill="${fill}" stroke="${stroke}" stroke-width="2.8" stroke-linejoin="round">${body}</g></svg>`;
}
function render(){
 boardEl.innerHTML='';
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const s=document.createElement('button');s.className='sq '+((r+c)%2?'dark':'light');
  if(lastMove&&(same(lastMove.from,{r,c})||same(lastMove.to,{r,c})))s.classList.add('last');
  if(selected&&same(selected,{r,c}))s.classList.add('selected');
  const isTarget=targets.some(x=>same(x,{r,c})); if(isTarget)s.classList.add(board[r][c]?'capture':'target');
  const p=board[r][c]; if(p){const e=document.createElement('span');e.className='piece';e.innerHTML=pieceSVG(p);s.appendChild(e)}
  s.addEventListener('click',()=>clickSquare(r,c));boardEl.appendChild(s);
 }
 updateClocks(); updateStatus();
}
function clickSquare(r,c){
 if(gameOver)return; const p=board[r][c];
 if(selected){const t=targets.find(x=>x.r===r&&x.c===c);if(t){makeMove(selected,t);return}}
 if(p&&color(p)===turn){selected={r,c};targets=legal(r,c,turn)}else{selected=null;targets=[]}render();
}
function animateMove(from,to,cb){
 const cells=boardEl.querySelectorAll('.sq'),src=cells[from.r*8+from.c],dst=cells[to.r*8+to.c],moving=src?.querySelector('.piece');
 if(!src||!dst||!moving){cb();return}
 const a=src.getBoundingClientRect(),b=dst.getBoundingClientRect(),ghost=document.createElement('div');
 ghost.className='move-piece';ghost.style.cssText=`left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;ghost.innerHTML=moving.innerHTML;document.body.appendChild(ghost);moving.style.visibility='hidden';
 const dx=b.left-a.left,dy=b.top-a.top,start=performance.now(),dur=340;
 function frame(now){const t=Math.min(1,(now-start)/dur),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2,lift=-Math.sin(Math.PI*t)*Math.min(a.height*.22,20);ghost.style.transform=`translate(${dx*e}px,${dy*e+lift}px) scale(${1+.045*Math.sin(Math.PI*t)})`;if(t<1)requestAnimationFrame(frame);else{ghost.remove();cb()}}
 requestAnimationFrame(frame);
}
function makeMove(from,to){
 const p=board[from.r][from.c],cap=board[to.r][to.c],side=turn;
 animateMove(from,to,()=>{board[to.r][to.c]=p;board[from.r][from.c]=null;clocks[side]=Math.min(180000,clocks[side]+increment);history.push({from,to,p,cap,side});lastMove={from,to};selected=null;targets=[];turn=opp(turn);const st=status(turn);if(st.over){end(st.msg);return}render();});
}
function legal(r,c,side){const p=board[r][c];if(!p||color(p)!==side)return[];return pseudo(r,c).filter(to=>{const b=clone(board);b[to.r][to.c]=b[r][c];b[r][c]=null;return !inCheck(b,side)})}
const clone=b=>b.map(r=>r.slice()),inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
function pseudo(r,c){
 const p=board[r][c],side=color(p),enemy=opp(side),out=[],P=p.toUpperCase();
 const add=(rr,cc)=>{if(!inside(rr,cc))return;const q=board[rr][cc];if(!q)out.push({r:rr,c:cc});else if(color(q)===enemy&&q.toUpperCase()!=='K')out.push({r:rr,c:cc})};
 const ray=(dr,dc)=>{let rr=r+dr,cc=c+dc;while(inside(rr,cc)){const q=board[rr][cc];if(!q)out.push({r:rr,c:cc});else{if(color(q)===enemy&&q.toUpperCase()!=='K')out.push({r:rr,c:cc});break}rr+=dr;cc+=dc}};
 if(P==='R')[[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>ray(...d));
 else if(P==='N')[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d=>add(r+d[0],c+d[1]));
 else if(P==='B'){[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));add(r+(side==='white'?-1:1),c)}
 else if(P==='Q'){[[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>ray(...d));if(!history.some(m=>m.side===side)){const d=side==='white'?-1:1;if(inside(r+2*d,c)&&!board[r+d][c]&&!board[r+2*d][c])out.push({r:r+2*d,c})}}
 else if(P==='K'){
  [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]].forEach(d=>add(r+d[0],c+d[1]));
  if(!history.some(m=>m.side===side)&&!inCheck(board,side))[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]].forEach(d=>add(r+d[0],c+d[1]));
 }
 else if(P==='P'){const d=side==='white'?-1:1;if(inside(r+d,c)&&!board[r+d][c])out.push({r:r+d,c});for(const dc of[-1,1]){const rr=r+d,cc=c+dc;if(inside(rr,cc)&&board[rr][cc]&&color(board[rr][cc])===enemy&&board[rr][cc].toUpperCase()!=='K')out.push({r:rr,c:cc})}}
 return out;
}
function findKing(b,side){const k=side==='white'?'K':'k';for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(b[r][c]===k)return{r,c};return null}
function inCheck(b,side){const k=findKing(b,side);return k?attacked(b,k,opp(side)):true}
function attacked(b,t,by){
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){const p=b[r][c];if(!p||color(p)!==by)continue;const P=p.toUpperCase(),dr=t.r-r,dc=t.c-c;
  if(P==='P'){const d=by==='white'?-1:1;if(dr===d&&Math.abs(dc)===1)return true}
  if(P==='N'&&Math.abs(dr)*Math.abs(dc)===2)return true;
  if(P==='K'&&Math.max(Math.abs(dr),Math.abs(dc))===1)return true;
  if(P==='Q'&&Math.abs(dr)===Math.abs(dc)&&clearRay(b,r,c,t.r,t.c))return true;
  if(P==='R'&&(dr===0||dc===0)&&clearRay(b,r,c,t.r,t.c))return true;
  if(P==='B'&&((Math.abs(dr)===Math.abs(dc))||(dc===0&&dr===(by==='white'?-1:1)))){if(Math.abs(dr)===Math.abs(dc))return true;if(dc===0&&!b[r+(by==='white'?-1:1)]?.[c])return true}
 }
 return false;
}
function clearRay(b,r,c,tr,tc){const sr=Math.sign(tr-r),sc=Math.sign(tc-c);let rr=r+sr,cc=c+sc;while(rr!==tr||cc!==tc){if(b[rr][cc])return false;rr+=sr;cc+=sc}return true}
function anyMove(side){for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]&&color(board[r][c])===side&&legal(r,c,side).length)return true;return false}
function status(side){const check=inCheck(board,side),has=anyMove(side);if(!has&&check)return{over:true,msg:`${side==='white'?'ភាគីស':'ភាគីខ្មៅ'} ចាញ់ — អុកមាត`};if(!has)return{over:true,msg:'ស្មើ — គ្មានដំណើរស្របច្បាប់'};return{over:false}}
function updateStatus(){if(gameOver)return;const check=inCheck(board,turn);turnLabel.textContent=`វេន ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'}${check?' • អុក!':''}`;statusEl.textContent=check?'អុក! ត្រូវដោះអុកមុនធ្វើដំណើរ':'ជ្រើសកូនមួយដើម្បីដើរ'}
function end(msg){gameOver=true;stopTimer();statusEl.textContent=msg;render()}
function fmt(ms){const s=Math.max(0,Math.ceil(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function updateClocks(){whiteClock.textContent=fmt(clocks.white);blackClock.textContent=fmt(clocks.black);whiteTop.textContent=fmt(clocks.white);blackTop.textContent=fmt(clocks.black);}
function startTimer(){stopTimer();lastTick=performance.now();timer=setInterval(()=>{const now=performance.now(),dt=now-lastTick;lastTick=now;clocks[turn]-=dt;if(clocks[turn]<=0){clocks[turn]=0;end(`⏱️ ${turn==='white'?'ភាគីស':'ភាគីខ្មៅ'} អស់ពេល`)}else updateClocks()},100)}
function stopTimer(){if(timer){clearInterval(timer);timer=null}}
$('resetBtn').onclick=()=>{stopTimer();board=INITIAL.map(r=>r.slice());turn='white';selected=null;targets=[];lastMove=null;gameOver=false;history=[];clocks={white:180000,black:180000};render();startTimer()};
$('helpBtn').onclick=()=>alert('អុកខ្មែរ\nកូនអុកមាន ៦ ប្រភេទខុសគ្នា៖ ស្តេច, នាង, គូល, សេះ, ទូក និង ត្រី។\nសេះ និង គូល មិនប្រើរូបដូចគ្នាទេ។\nដំណើរត្រីបក និងច្បាប់លម្អិតអាចកែតាមក្បួនអុកខ្មែររបស់គម្រោង។');
render();startTimer();
