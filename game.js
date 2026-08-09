const boardEl=document.getElementById("board");
const turnEl=document.getElementById("turn");
const msgEl=document.getElementById("message");
const bc=document.getElementById("bc"), wc=document.getElementById("wc");
document.getElementById("restart").onclick=reset;

const W="white", B="black";
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

let board, turn, phase, selectedOpening=[], selected=null, gameOver=false;
let callTrap=null; // {side, r, c, captureMoves:[{from:[r,c],to:[r,c]}...]}

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
  callTrap=null;
  board.openingDone=false;
  render();
  message(`ដំណាក់កាលដំបូង៖ ${sideName(turn)} ជ្រើសកូន ២ ក្នុងពេលតែមួយ។`);
}

function sideName(s){return s===W?"ភាគីស":"ភាគីខ្មៅ"}

// ស្តេច និងកូនទ័ពមានសិទ្ធិដើរដូចគ្នា បន្ទាប់ពីការចេញដំបូង
function canMoveNormally(p){
  return !!p && (p.side===W || p.side===B);
}
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


/*
=========================================
មុខងារ "ព័ទ្ធ" — ច្បាប់តាមការបញ្ជាក់របស់អ្នក
=========================================

- កូនដែលជាប់គ្នាតាម ៤ ទិស (លើ/ក្រោម/ឆ្វេង/ស្តាំ)
  ត្រូវចាត់ទុកជា "ក្រុម" តែមួយ។
- កូនខ្លួនឯងដែលជាប់គ្នា មិនមែនជាប្រឡោះទេ
  ប៉ុន្តែវាជាផ្នែកនៃក្រុម។
- ប្រឡោះ (liberty) គឺ "ក្រឡាទំនេរ" ដែលនៅជាប់ក្រុមតាម ៤ ទិស។
- បើក្រុមមានប្រឡោះទំនេរ >= 1 -> ក្រុមទាំងមូលរស់។
- បើក្រុមគ្មានប្រឡោះទំនេរសោះ -> ក្រុមទាំងមូលស្លាប់។
- ក្រឡាក្រៅក្តារ មិនរាប់ជាប្រឡោះ។
- កូននៅជ្រុងអាចរស់បាន ប្រសិនបើនៅសល់ក្រឡាទំនេរខាងក្នុង។
- បើក្រុមដែលត្រូវព័ទ្ធមានស្តេច -> ភាគីនោះចាញ់។
*/
function getGroup(sr,sc){
  const p=board[sr][sc];
  if(!p)return {cells:[],liberties:[],hasKing:false};

  const side=p.side;
  const cells=[];
  const liberties=[];
  const seen=new Set();
  const q=[[sr,sc]];
  seen.add(`${sr},${sc}`);

  while(q.length){
    const [r,c]=q.shift();
    cells.push([r,c]);

    for(const [dr,dc] of DIRS){
      const nr=r+dr,nc=c+dc;
      if(!inside(nr,nc)) continue;

      const np=board[nr][nc];
      if(!np){
        const key=`${nr},${nc}`;
        if(!liberties.some(([lr,lc])=>lr===nr&&lc===nc)){
          liberties.push([nr,nc]);
        }
      }else if(np.side===side){
        const key=`${nr},${nc}`;
        if(!seen.has(key)){
          seen.add(key);
          q.push([nr,nc]);
        }
      }
    }
  }

  return {
    cells,
    liberties,
    hasKing: cells.some(([r,c])=>board[r][c]?.king)
  };
}

/*
ពិនិត្យតែ "ក្រុមរបស់ភាគីដែលទើបត្រូវប៉ះពាល់"
បន្ទាប់ពីចលនារួច។
ដូច្នេះមិនសម្លាប់កូនផ្សេងៗដោយចៃដន្យទេ។
*/
function applySurroundAfterMove(r,c,movingSide){
  const enemy=movingSide===W?B:W;
  const checked=new Set();
  const deadGroups=[];
  let kingCaptured=false;

  // ពិនិត្យក្រុមសត្រូវដែលនៅជាប់ក្រឡាដែលទើបដើរចូល
  for(const [dr,dc] of DIRS){
    const nr=r+dr,nc=c+dc;
    if(!inside(nr,nc)) continue;

    const np=board[nr][nc];
    if(!np || np.side!==enemy) continue;

    const key=`${nr},${nc}`;
    if(checked.has(key)) continue;

    const group=getGroup(nr,nc);
    for(const cell of group.cells){
      checked.add(`${cell[0]},${cell[1]}`);
    }

    if(group.liberties.length===0){
      deadGroups.push(group);
      if(group.hasKing) kingCaptured=true;
    }
  }

  let removed=0;
  for(const group of deadGroups){
    for(const [gr,gc] of group.cells){
      if(board[gr][gc]){
        board[gr][gc]=null;
        removed++;
      }
    }
  }

  return {removed,kingCaptured,deadGroups};
}


/*
=========================================
«ហៅរែក» — អន្ទាក់លះបង់កងទ័ព
=========================================
ការហៅរែកត្រូវកើតដោយស្វ័យប្រវត្តិ បន្ទាប់ពីអ្នកលេងដើរ
កងទ័ពរបស់ខ្លួន ហើយចលនានោះបង្កើតឱកាសឱ្យគូប្រកួត
រែកកងទ័ពដែលទើបដើរ។

គូប្រកួតអាចជ្រើសកូនណាមួយក្នុងចំណោមកូន ២ ឬច្រើន
ដែលអាចរែកបាន។ បើគ្មានចលនាណាអាចរែកកងទ័ពដែល
ត្រូវបានហៅ -> មិនចាត់ទុកជាហៅរែក ហ្គេមបន្តធម្មតា។

ចំណាំ៖ ការហៅរែកត្រូវប្រើ "កូនទ័ព" មិនមែនស្តេច
ដើម្បីស្របនឹងគំនិតលះបង់កងទ័ព។
*/

// រកចលនារបស់គូប្រកួតដែលអាច "រែក" កូនដែលត្រូវហៅ
function getCallCaptureMoves(targetR,targetC,enemySide){
  const moves=[];
  const target=board[targetR][targetC];
  if(!target || target.side===enemySide || target.king) return moves;

  // បើ target នៅជាប់ក្នុងប្រឡោះដែលមាន enemy pieces
  // ការរែកត្រូវកើតនៅក្រឡាដែល enemy ទើបដើរចូល។
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const p=board[r][c];
      if(!p || p.side!==enemySide) continue;

      for(const [tr,tc] of normalMoves(r,c)){
        // សាកចលនា p -> (tr,tc) ជាបណ្តោះអាសន្ន
        board[tr][tc]=p;
        board[r][c]=null;

        const cap=captureAt(tr,tc,enemySide);
        const hitsTarget=cap.some(([vr,vc])=>vr===targetR&&vc===targetC);

        board[r][c]=p;
        board[tr][tc]=null;

        if(hitsTarget){
          moves.push({from:[r,c],to:[tr,tc]});
        }
      }
    }
  }
  return moves;
}

// ស្វែងរកការហៅរែកបន្ទាប់ពីកូនទ័ពរបស់អ្នកដើររួច
function detectCallTrap(r,c,movedSide){
  const p=board[r][c];
  if(!p || p.side!==movedSide || p.king) return null;

  const enemy=movedSide===W?B:W;
  const captures=getCallCaptureMoves(r,c,enemy);

  if(captures.length===0) return null;

  return {side:movedSide,r,c,captureMoves:captures};
}

// អនុវត្តចលនារែកដែលគូប្រកួតជ្រើសក្នុងហៅរែក
function executeCallCapture(move){
  const [fr,fc]=move.from;
  const [tr,tc]=move.to;
  const p=board[fr][fc];
  if(!p) return false;

  board[tr][tc]=p;
  board[fr][fc]=null;

  const cap=performCapture(tr,tc,p.side);

  // បើ target/sacrifice ត្រូវបានរែក វានឹងស្ថិតក្នុង cap.victims
  return {cap,moved:p};
}

function clickNormal(r,c){
  if(gameOver)return;

  // =====================================
  // កំពុងបំពេញ "ហៅរែក" — គូប្រកួតត្រូវជ្រើស
  // =====================================
  if(callTrap){
    const chosen=callTrap.captureMoves.find(m=>m.to[0]===r&&m.to[1]===c);
    if(chosen){
      const result=executeCallCapture(chosen);
      const captured=result.cap;

      callTrap=null;
      selected=null;

      if(captured.kingCaptured){
        gameOver=true;
        message(`${sideName(result.moved.side)} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានរែក។`);
      }else{
        // បន្ទាប់ពីគេរែកហើយ វេនត្រឡប់ទៅអ្នកដែលបានហៅរែក
        turn=turn===W?B:W;
        message(`បានឆ្លើយតបការហៅរែក។ រែកបាន ${kh(captured.victims.length)} កូន។ វេន ${sideName(turn)}។`);
      }
      render();
      return;
    }

    message("ត្រូវជ្រើសចលនាដែលអាចមករែកកូនដែលត្រូវបានហៅ។");
    return;
  }

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

      // រែកធម្មតានៅទីតាំងថ្មី
      const cap=performCapture(r,c,moved.side);

      if(cap.kingCaptured){
        gameOver=true;
        message(`${sideName(moved.side)} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានរែក។`);
        render();
        return;
      }

      // ព័ទ្ធក្រុមសត្រូវ
      const surround=applySurroundAfterMove(r,c,moved.side);

      if(surround.kingCaptured){
        gameOver=true;
        message(`${sideName(moved.side)} ឈ្នះ! ស្តេចគូប្រកួតត្រូវបានព័ទ្ធ។`);
        render();
        return;
      }

      /*
      ហៅរែកមិនកើតដោយស្វ័យប្រវត្តិទៀតទេ។
      បន្ទាប់ពីដើររួច អ្នកលេងអាចជ្រើស "ហៅរែក" ដោយដៃ។
      ប៊ូតុងនឹងដំណើរការតែបើប្រព័ន្ធគណនាឃើញថា
      គូប្រកួតមានយ៉ាងហោចណាស់ ១ ចលនាដែលអាចមករែក
      កូនដែលទើបដើរនោះ។
      */
      turn=turn===W?B:W;

      if(cap.victims.length===2 && surround.removed>0)
        message(`រែកបាន ២ កូន និងព័ទ្ធបាន ${kh(surround.removed)} កូន។ វេន ${sideName(turn)}។`);
      else if(cap.victims.length===2)
        message(`រែកបាន ២ កូន។ វេន ${sideName(turn)}។`);
      else if(surround.removed>0)
        message(`ព័ទ្ធបាន ${kh(surround.removed)} កូន។ វេន ${sideName(turn)}។`);
      else
        message(`វេន ${sideName(turn)}។ បើចង់ហៅរែក សូមជ្រើសកូនដែលទើបដើរ ហើយចុចប៊ូតុង «ហៅរែក»។`);

      render();
      return;
    }

    selected=null;
  }

  if(canMoveNormally(p) && p.side===turn){
    selected=[r,c];
    message(p.king
      ? "បានជ្រើសស្តេច។ ស្តេចអាចដើរ រែក និងព័ទ្ធដូចកូនទ័ព។"
      : "បានជ្រើសកូនទ័ព។ ជ្រើសក្រឡាដើម្បីដើរ។");
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


function tryCallTrap(){
  if(gameOver || phase!=="normal" || callTrap) return;

  /*
  កូនដែលត្រូវហៅរែក គឺកូនដែលបានជ្រើសនៅពេលបច្ចុប្បន្ន។
  ប៊ូតុងមិនធ្វើអ្វី ប្រសិនបើមិនបានជ្រើសកូនទ័ព។
  */
  if(!selected){
    message("សូមជ្រើសកូនទ័ពដែលទើបដើរ មុនចុច «ហៅរែក»។");
    return;
  }

  const [r,c]=selected;
  const p=board[r][c];

  if(!p || p.side!==turn || p.king){
    message("«ហៅរែក» អាចប្រើបានសម្រាប់កូនទ័ពដែលទើបដើរប៉ុណ្ណោះ។");
    return;
  }

  /*
  ពេលដល់វេនអ្នកដែលទើបដើរ វាត្រូវជ្រើសកូនដែលទើបដើរ
  ហើយប៊ូតុងនឹងគណនាថាគូប្រកួតមានអ្នកអាចមករែកឬអត់។
  */
  const enemy=turn===W?B:W;
  const captures=getCallCaptureMoves(r,c,enemy);

  if(captures.length===0){
    message("មិនអាចហៅរែកបានទេ — គូប្រកួតគ្មានកូនដែលអាចមករែកក្រឡានេះ។");
    return;
  }

  callTrap={side:turn,r,c,captureMoves:captures};
  selected=null;
  turn=enemy;

  message(`🪤 បានហៅរែក! ${sideName(turn)} អាចជ្រើសកូនណាមួយក្នុង ${kh(captures.length)} ជម្រើស ដើម្បីមករែក។`);
  render();
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
    }else if(callTrap){
      if(callTrap.captureMoves.some(m=>m.to[0]===r&&m.to[1]===c))
        cell.classList.add("move-choice");
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

  // ប៊ូតុងហៅរែក — មិនបង្ហាញក្នុងដំណាក់កាលចេញដំបូង
  let oldCall=document.getElementById("callTrapButton");
  if(oldCall)oldCall.remove();

  if(phase==="normal" && !callTrap && selected){
    const p=board[selected[0]][selected[1]];
    if(p && p.side===turn && !p.king){
      const btn=document.createElement("button");
      btn.id="callTrapButton";
      btn.textContent="🪤 ហៅរែក";
      btn.style.display="block";
      btn.style.margin="10px auto";
      btn.onclick=tryCallTrap;
      boardEl.after(btn);
    }
  }

  bc.textContent=kh(count(B));
  wc.textContent=kh(count(W));
  turnEl.textContent=gameOver?"ចប់ការប្រកួត":
    callTrap
      ? `🪤 ហៅរែក៖ ${sideName(turn)} ត្រូវជ្រើសចលនារែក`
      : `វេន៖ ${sideName(turn)}${phase==="opening"?" · ជ្រើសកូន ២":""}`;
}

function message(t){msgEl.textContent=t}
reset();
