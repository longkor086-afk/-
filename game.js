const boardEl=document.getElementById("board");
const turnText=document.getElementById("turnText");
const message=document.getElementById("message");
const blackCount=document.getElementById("blackCount");
const whiteCount=document.getElementById("whiteCount");
document.getElementById("newGame").onclick=reset;

const W="white",B="black";
let board,turn,selected=null,gameOver=false;

/*
ច្បាប់សំខាន់របស់ "រែក":
- រែកកើតឡើងតែពេល "កូនដែលទើបដើចូល" ស្ថិតនៅក្នុងប្រឡោះ
  ហើយមានកូនគូប្រកួត 2 នៅជាប់ខាងទាំងពីរ។
- មាន 4 ទិស: ឆ្វេង+ស្តាំ និង លើ+ក្រោម។
- សម្លាប់តែ 2 កូនដែលនៅសងខាងប៉ុណ្ណោះ។
- មិនសម្លាប់កូនផ្សេងទៀតដែលនៅជិត។
- បើគ្រាន់តែមានកូនគូប្រកួតនៅម្ខាង មិនរែកទេ។
*/
function initialBoard(){
  const x=Array.from({length:8},()=>Array(8).fill(null));
  // ការរៀបចំដើមតាមគំរូ 16 កូនមួយភាគី
  for(let c=0;c<8;c++)x[0][c]={side:B,king:false};
  for(let c=0;c<8;c++)x[2][c]={side:B,king:false};
  x[1][0]={side:B,king:true};

  for(let c=0;c<8;c++)x[5][c]={side:W,king:false};
  for(let c=0;c<7;c++)x[7][c]={side:W,king:false};
  x[6][7]={side:W,king:true};
  return x;
}

function reset(){
  board=initialBoard();
  turn=Math.random()<.5?W:B;
  selected=null;gameOver=false;
  render();
  setMsg(`អ្នកចាប់ផ្ដើមគឺ ${turn===W?"ភាគីស":"ភាគីខ្មៅ"}។ ដំបូងត្រូវចេញកូន ២ ដើម្បីបង្កើតការរែកគ្នា។`);
}

function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];

function moves(r,c){
  const p=board[r][c];if(!p)return[];
  const out=[];
  for(const [dr,dc] of dirs){
    let nr=r+dr,nc=c+dc;
    while(inside(nr,nc)){
      if(board[nr][nc])break;
      out.push([nr,nc]);
      nr+=dr;nc+=dc;
    }
  }
  return out;
}

/* ពិនិត្យតែទីតាំងដែល "ទើបដើរចូល" */
function captureAt(r,c,side){
  const enemy=side===W?B:W;
  const captured=[];
  // ផ្ដេក: enemy [r,c-1] + enemy [r,c+1]
  if(inside(r,c-1)&&inside(r,c+1)
     &&board[r][c-1]?.side===enemy
     &&board[r][c+1]?.side===enemy){
    captured.push([r,c-1],[r,c+1]);
  }
  // បញ្ឈរ: enemy [r-1,c] + enemy [r+1,c]
  if(inside(r-1,c)&&inside(r+1,c)
     &&board[r-1][c]?.side===enemy
     &&board[r+1][c]?.side===enemy){
    captured.push([r-1,c],[r+1,c]);
  }
  return captured;
}

function doCapture(r,c,side){
  const victim=captureAt(r,c,side);
  // ដកតែ 2 កូនដែលត្រូវបានរែក
  for(const [rr,cc] of victim){
    if(board[rr][cc] && board[rr][cc].side!==side && !board[rr][cc].king){
      board[rr][cc]=null;
    }
  }
  return victim.length;
}

function kingExists(side){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)
    if(board[r][c]?.side===side&&board[r][c]?.king)return true;
  return false;
}
function count(side){
  let n=0;
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===side)n++;
  return n;
}

function click(r,c){
  if(gameOver)return;
  const p=board[r][c];

  if(selected){
    const [sr,sc]=selected;
    if(moves(sr,sc).some(([a,b])=>a===r&&b===c)){
      const moved=board[sr][sc];
      board[r][c]=moved;
      board[sr][sc]=null;
      selected=null;

      // សំខាន់៖ រែកត្រូវពិនិត្យនៅក្រឡាថ្មីដែលកូនទើបដើរចូលប៉ុណ្ណោះ
      const n=doCapture(r,c,moved.side);

      if(!kingExists(W)||!kingExists(B)){
        gameOver=true;
        setMsg(!kingExists(W)?"ស្តេចសចាញ់!":"ស្តេចខ្មៅចាញ់!");
      }else{
        turn=turn===W?B:W;
        setMsg(n===2
          ?`រែកបាន ២ កូន — ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} ដើរបន្ត។`
          :`មិនមានរែក — ${turn===W?"ភាគីស":"ភាគីខ្មៅ"} ដើរ។`);
      }
      render();return;
    }
    selected=null;
  }

  if(p&&p.side===turn){
    selected=[r,c];
    setMsg(`បានជ្រើសរើស${p.king?"ស្តេច":"កូនទ័ព"}។ ជ្រើសរើសក្រឡាដើម្បីដើរ។`);
  }else{
    setMsg("សូមជ្រើសរើសកូនរបស់ភាគីដែលកំពុងមានវេន។");
  }
  render();
}

function render(){
  boardEl.innerHTML="";
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cell=document.createElement("div");cell.className="cell";
    if(selected?.[0]===r&&selected?.[1]===c)cell.classList.add("selected");
    if(selected&&moves(...selected).some(([a,b])=>a===r&&b===c))cell.classList.add("canmove");
    cell.onclick=()=>click(r,c);
    const p=board[r][c];
    if(p){
      const el=document.createElement("div");
      el.className=`piece ${p.side}${p.king?" king":""}`;
      cell.appendChild(el);
    }
    boardEl.appendChild(cell);
  }
  const kh=n=>String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d]);
  blackCount.textContent=kh(count(B));whiteCount.textContent=kh(count(W));
  turnText.textContent=gameOver?"ចប់ការប្រកួត":`វេន៖ ${turn===W?"ភាគីស ⚪":"ភាគីខ្មៅ ⚫"}`;
}
function setMsg(t){message.textContent=t}
reset();
