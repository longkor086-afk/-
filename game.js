const boardEl=document.getElementById("board");
const turnEl=document.getElementById("turn");
const msgEl=document.getElementById("message");
const bc=document.getElementById("bc"), wc=document.getElementById("wc");
document.getElementById("restart").onclick=reset;

const W="white", B="black";
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

let board, turn, phase, selectedOpening=[], selected=null, gameOver=false;

function initialBoard(){
  const a=Array.from({length:8},()=>Array(8).fill(null));

  // ខ្មៅ = 7 + ស្តេច 1 + 8 = 16
  for(let c=1;c<8;c++) a[0][c]={side:B,king:false};
  a[1][0]={side:B,king:true};
  for(let c=0;c<8;c++) a[2][c]={side:B,king:false};

  // ស = 8 + ស្តេច 1 + 7 = 16
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
  board.openingDone=false;
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

/* កូន ២ ត្រូវនៅចន្លោះគ្នា ១ ក្រឡា */
function validOpeningPair(a,b){
  const [r1,c1]=a,[r2,c2]=b;
  return (r1===r2&&Math.abs(c1-c2)===2) ||
         (c1===c2&&Math.abs(r1-r2)===2);
}

function openingClick(r,c){
  const p=board[r][c];
  const front=openingFrontRow(turn);
  if(!p||p.side!==turn){
    message("សូមជ្រើសរើសកូនរបស់ភាគីដែលកំពុងមានវេន។");
    return;
  }
  if(r!==front || p.king){
    message("នៅដំណាក់កាលដំបូង ត្រូវជ្រើសកូនទ័ពនៅជួរមុខ។");
    return;
  }

  if(selectedOpening.length===0){
    selectedOpening=[[r,c]];
    message("បានជ្រើសកូនទី១។ ឥឡូវជ្រើសកូនទី២ ដែលរំលង ១ ក្រឡា។");
    render();
    return;
  }

  if(selectedOpening[0][0]===r&&selectedOpening[0][1]===c){
    selectedOpening=[];
    message("បានលុបការជ្រើស។");
    render();
    return;
  }

  const pair=[selectedOpening[0],[r,c]];
  if(!validOpeningPair(...pair)){
    message("មិនត្រឹមត្រូវ៖ កូនទាំង ២ ត្រូវនៅរំលងគ្នា ១ ក្រឡា ដូចជា ១ និង ៣ ឬ ២ និង ៤។");
    return;
  }

  selectedOpening=pair;
  message("បានជ្រើសកូន ២។ ចុច «បញ្ជាក់ចេញកូន ២»។");
  render();
}

function openingFrontRow(side){
  return side===B ? 2 : 5; // ខ្មៅជួរមុខ row 3, សជួរមុខ row 6 (រាប់ពី 0)
}

function openingDirection(side){
  return side===B ? 1 : -1; // ខ្មៅចុះក្រោម, សឡើងលើ
}

function confirmOpening(){
  if(selectedOpening.length!==2)return;

  const front=openingFrontRow(turn);
  const dir=openingDirection(turn);

  // កូន ២ ត្រូវជាកូនទ័ពនៅជួរមុខ ហើយនៅរំលងគ្នា ១ ក្រឡា
  for(const [r,c] of selectedOpening){
    const p=board[r][c];
    if(r!==front || !p || p.side!==turn || p.king){
      message("ការចេញដំបូងត្រូវជ្រើសកូនទ័ព ២ នៅជួរមុខ។");
      return;
    }
  }

  const destinations=selectedOpening.map(([r,c])=>[r+dir,c]);

  // គោលដៅទាំង ២ ត្រូវទំនេរ
  if(destinations.some(([r,c])=>!inside(r,c)||board[r][c])){
    message("ក្រឡាខាងមុខមិនទំនេរ។ សូមជ្រើសគូកូនផ្សេង។");
    return;
  }

  // ផ្លាស់ទីកូនទាំង ២ ជាមួយគ្នា ក្នុងសកម្មភាពតែមួយ
  const pieces=selectedOpening.map(([r,c])=>board[r][c]);
  for(const [r,c] of selectedOpening) board[r][c]=null;
  destinations.forEach(([r,c],i)=>{
    board[r][c]=pieces[i];
    board[r][c].opened=true;
  });

  selectedOpening=[];

  if(!board.openingDone){
    board.openingDone=true;
    turn=turn===W?B:W;
    message(`ភាគីទីមួយបានចេញកូន ២ ជាមួយគ្នា។ ឥឡូវ ${sideName(turn)} ជ្រើសកូន ២ នៅជួរមុខ។`);
  }else{
    phase="normal";
    // បន្ទាប់ពីភាគីទីពីរចេញកូន ២ រួច វេនត្រឡប់ទៅភាគីទីមួយ
    turn=turn===W?B:W;
    message(`ភាគីទាំងពីរបានចេញកូន ២ រួច។ ឥឡូវលេងធម្មតា មួយកូនម្តង។`);
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

/*
========================
ច្បាប់រែក — ចំណុចសំខាន់
========================

រែកកើតតែ "ក្រឡាដែលកូនទើបដើរចូល"។

បើកូនដែលទើបដើរចូលស្ថិតនៅកណ្ដាល៖

    ខ្មៅ
    ស   <- កូនទើបដើរចូល
    ខ្មៅ

ឬ

ខ្មៅ  ស  ខ្មៅ

នោះខ្មៅ ២ កូនត្រូវបានរែកចេញ។

- ពិនិត្យទាំងបញ្ឈរ និងផ្ដេក។
- សម្លាប់តែ ២ កូនដែលនៅជាប់ខាងទាំងពីរ។
- មិនសម្លាប់កូនផ្សេងទៀត។
- បើមួយក្នុងចំណោម ២ ជាស្តេច -> ភាគីស្តេចត្រូវរែកចាញ់។
- បើមានសត្រូវតែម្ខាង -> មិនរែក។
- មិនពិនិត្យក្រឡាផ្សេងទៀតលើក្តារ។
*/
function captureAt(r,c,movingSide){
  const enemy=movingSide===W?B:W;
  const victims=[];

  // ផ្ដេក
  if(inside(r,c-1)&&inside(r,c+1)){
    const left=board[r][c-1], right=board[r][c+1];
    if(left?.side===enemy && right?.side===enemy){
      victims.push([r,c-1],[r,c+1]);
    }
  }

  // បញ្ឈរ
  if(inside(r-1,c)&&inside(r+1,c)){
    const up=board[r-1][c], down=board[r+1][c];
    if(up?.side===enemy && down?.side===enemy){
      victims.push([r-1,c],[r+1,c]);
    }
  }

  // ក្នុងមួយចលនា ប្រសិនបើមានលក្ខខណ្ឌពីរទិស អាចមាន 4 victims
  // ប៉ុន្តែច្បាប់របស់អ្នកនិយាយថា រែកមួយលើកសម្លាប់តែគូដែលត្រូវបានរែក។
  // ដើម្បីកុំឱ្យសម្លាប់លើស 2 យើងយកតែគូដំបូងដែលរកឃើញ។
  return victims.slice(0,2);
}

function performCapture(r,c,movingSide){
  const victims=captureAt(r,c,movingSide);
  let kingCaptured=false;

  for(const [vr,vc] of victims){
    const p=board[vr][vc];
    if(!p || p.side===movingSide) continue;
    if(p.king) kingCaptured=true;
    board[vr][vc]=null;
  }

  return {victims, kingCaptured};
}

function clickNormal(r,c){
  const p=board[r][c];

  if(selected){
    const [sr,sc]=selected;
    const legal=normalMoves(sr,sc).some(([a,b])=>a===r&&b===c);

    if(legal){
      const moved=board[sr][sc];

      // ដើរចូលក្រឡាគោលដៅ
      board[r][c]=moved;
      board[sr][sc]=null;
      selected=null;

      // រែកត្រូវពិនិត្យ "តែទីតាំងថ្មី" នេះ
      const cap=performCapture(r,c,moved.side);

      if(cap.kingCaptured){
        gameOver=true;
        message(`${sideName(moved.side)} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានរែក។`);
      }else if(cap.victims.length===2){
        turn=turn===W?B:W;
        message(`រែកបាន ២ កូន។ ឥឡូវ ${sideName(turn)} ដើរ។`);
      }else{
        turn=turn===W?B:W;
        message(`មិនមានរែក។ ឥឡូវ ${sideName(turn)} ដើរ។`);
      }

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
  if(phase==="opening")openingClick(r,c);
  else clickNormal(r,c);
}

function render(){
  boardEl.innerHTML="";

  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cell=document.createElement("div");
    cell.className="cell";

    if(selected?.[0]===r&&selected?.[1]===c)cell.classList.add("selected");

    if(phase==="opening"){
      if(selectedOpening.some(([a,b])=>a===r&&b===c))
        cell.classList.add("opening-choice");
    }else if(selected){
      if(normalMoves(...selected).some(([a,b])=>a===r&&b===c))
        cell.classList.add("move-choice");
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
  turnEl.textContent=gameOver?"ចប់ការប្រកួត":
    `វេន៖ ${sideName(turn)}${phase==="opening"?" · ជ្រើសកូន ២":""}`;
}

function message(t){msgEl.textContent=t}
reset();
