const W="white", B="black";
const files=["ក","ខ","គ","ឃ","ង","ច","ឆ","ជ"];
const names={K:"អង្គ",Q:"នាង",B:"គោល",N:"សេះ",R:"ទូក",P:"ត្រី"};
const glyph={K:"♔",Q:"♕",B:"♗",N:"♘",R:"♜",P:"●"};
let board=[],turn=W,selected=null,gameOver=false;
let kingJump={white:true,black:true}, kingAimed={white:false,black:false};
let queenFirst={white:true,black:true};

function kh(n){return String(n).replace(/\d/g,d=>"០១២៣៤៥៦៧៨៩"[d])}
function sideName(s){return s===W?"ស":"ខ្មៅ"}
function inside(r,c){return r>=0&&r<8&&c>=0&&c<8}
function enemy(s){return s===W?B:W}

function piece(side,type){return {side,type}}
function setup(){
  board=Array.from({length:8},()=>Array(8).fill(null));
  const back=["R","N","B","Q","K","B","N","R"];
  for(let c=0;c<8;c++){
    board[0][c]=piece(B,back[c]);
    board[1][c]=piece(B,"P");
    board[6][c]=piece(W,"P");
    board[7][c]=piece(W,back[c]);
  }
  turn=W; selected=null; gameOver=false;
  kingJump={white:true,black:true}; kingAimed={white:false,black:false};
  queenFirst={white:true,black:true};
  render(); message("ស ចាប់ផ្តើម។ ជ្រើសកូនអុកមួយ។");
}

function attacks(r,c,p,ignoreKing=false){
  const out=[];
  const f=p.side===W?-1:1;
  const add=(rr,cc)=>{if(inside(rr,cc))out.push([rr,cc])}
  if(p.type==="K"){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(r+dr,c+dc)}
  else if(p.type==="Q"){for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]])add(r+dr,c+dc)}
  else if(p.type==="B"){add(r+f,c);for(const dc of [-1,1])add(r+f,c+dc);for(const dc of [-1,1])add(r-f,c+dc)}
  else if(p.type==="N"){for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(r+dr,c+dc)}
  else if(p.type==="R"){for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){let rr=r+dr,cc=c+dc;while(inside(rr,cc)){out.push([rr,cc]);if(board[rr][cc])break;rr+=dr;cc+=dc}}}
  else if(p.type==="P"){add(r+f,c-1);add(r+f,c+1)}
  return out;
}

function findKing(s){
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s&&board[r][c].type==="K")return[r,c];
  return null;
}
function isAttacked(r,c,by){
  for(let rr=0;rr<8;rr++)for(let cc=0;cc<8;cc++){
    const p=board[rr][cc];if(p?.side!==by)continue;
    if(attacks(rr,cc,p).some(x=>x[0]===r&&x[1]===c))return true;
  }
  return false;
}
function inCheck(s){const k=findKing(s);return k?isAttacked(k[0],k[1],enemy(s)):true}

function pseudoMoves(r,c){
  const p=board[r][c], out=[]; if(!p)return out;
  const f=p.side===W?-1:1;
  const add=(rr,cc,kind="move")=>{
    if(!inside(rr,cc))return;
    const t=board[rr][cc];
    if(t?.side===p.side)return;
    if(t?.type==="K")return;
    out.push({r:rr,c:cc,kind})
  };
  if(p.type==="K"){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(r+dr,c+dc);
    if(kingJump[p.side]&&!kingAimed[p.side]&&!inCheck(p.side)){
      for(const [dr,dc] of [[-2,-1],[-2,1],[2,-1],[2,1],[-1,-2],[-1,2],[1,-2],[1,2]]){
        const rr=r+dr,cc=c+dc;
        if(inside(rr,cc)&&!board[rr][cc])out.push({r:rr,c:cc,kind:"kingjump"});
      }
    }
  }else if(p.type==="Q"){
    for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]])add(r+dr,c+dc);
    if(queenFirst[p.side]){
      const rr=r+2*f;
      if(inside(rr,c)&&!board[r+f][c]&&!board[rr][c])out.push({r:rr,c,kind:"queenjump"});
    }
  }else if(p.type==="B"){
    add(r+f,c);
    add(r+f,c-1);add(r+f,c+1);
  }else if(p.type==="N"){
    for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(r+dr,c+dc);
  }else if(p.type==="R"){
    for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
      let rr=r+dr,cc=c+dc;
      while(inside(rr,cc)){if(board[rr][cc]){add(rr,cc,"capture");break}add(rr,cc);rr+=dr;cc+=dc}
    }
  }else if(p.type==="P"){
    const rr=r+f;
    if(inside(rr,c)&&!board[rr][c])add(rr,c);
    for(const dc of [-1,1])if(inside(rr,c+dc)&&board[rr][c+dc]?.side===enemy(p.side))add(rr,c+dc,"capture");
  }
  return out;
}

function legalMoves(r,c){
  const p=board[r][c]; if(!p)return[];
  const out=[];
  for(const m of pseudoMoves(r,c)){
    const old=board[m.r][m.c]; board[m.r][m.c]=p; board[r][c]=null;
    const ok=!inCheck(p.side);
    board[r][c]=p;board[m.r][m.c]=old;
    if(ok)out.push(m);
  }
  return out;
}

function allMoves(s){
  const out=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]?.side===s)out.push(...legalMoves(r,c).map(m=>({...m,fromR:r,fromC:c})));
  return out;
}

function updateKingAim(){
  // If an enemy rook ever lines up with the king, the special jump is permanently lost.
  for(const s of [W,B]){
    const k=findKing(s);if(!k||kingAimed[s])continue;
    const [kr,kc]=k;
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const p=board[r][c];
      if(p?.side===enemy(s)&&p.type==="R"&&(r===kr||c===kc)){
        let clear=true;
        const dr=Math.sign(kr-r),dc=Math.sign(kc-c);
        let rr=r+dr,cc=c+dc;
        while(rr!==kr||cc!==kc){if(board[rr][cc]){clear=false;break}rr+=dr;cc+=dc}
        if(clear)kingAimed[s]=true;
      }
    }
  }
}

function makeMove(fr,fc,tr,tc){
  const p=board[fr][fc], captured=board[tr][tc];
  board[tr][tc]=p;board[fr][fc]=null;
  if(p.type==="K")kingJump[p.side]=false;
  if(p.type==="Q")queenFirst[p.side]=false;
  if(p.type==="P"){
    const promoRank=p.side===W?2:5;
    if(tr===promoRank)p.type="Q";
  }
  updateKingAim();

  if(captured?.type==="K"){
    gameOver=true;message(`${sideName(p.side)} ឈ្នះ! អង្គត្រូវបានអុកងាប់។`);return;
  }

  turn=enemy(turn);selected=null;
  const moves=allMoves(turn);
  if(inCheck(turn)&&moves.length===0){gameOver=true;message(`${sideName(enemy(turn))} ឈ្នះ! អុកងាប់ (Checkmate)។`);}
  else if(!inCheck(turn)&&moves.length===0){gameOver=true;message("ស្មើ! អង្គមិនជាប់អុក ប៉ុន្តែមិនមានចលនាស្របច្បាប់។");}
  else if(inCheck(turn))message(`${sideName(turn)} កំពុងជាប់អុក!`);
  else message(`វេន ${sideName(turn)}។`);
  render();
}

function onCell(r,c){
  if(gameOver)return;
  const p=board[r][c];
  if(selected){
    const moves=legalMoves(selected.r,selected.c);
    const m=moves.find(x=>x.r===r&&x.c===c);
    if(m){makeMove(selected.r,selected.c,r,c);return}
    if(p?.side===turn){selected={r,c};render();return}
    selected=null;render();return;
  }
  if(p?.side===turn){selected={r,c};render()}
}

function render(){
  const el=document.getElementById("board");el.innerHTML="";
  const moves=selected?legalMoves(selected.r,selected.c):[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const cell=document.createElement("div");
    cell.className="cell "+(((r+c)%2===0)?"light":"dark");
    if(selected?.r===r&&selected?.c===c)cell.classList.add("selected");
    const m=moves.find(x=>x.r===r&&x.c===c);
    if(m){cell.classList.add(m.kind==="capture"?"capture":"move")}
    const p=board[r][c];
    if(p){
      const d=document.createElement("div");
      d.className="piece "+(p.side===W?"whitePiece":"blackPiece");
      d.textContent=glyph[p.type];
      d.title=names[p.type];
      cell.appendChild(d);
    }
    cell.onclick=()=>onCell(r,c);
    el.appendChild(cell);
  }
  document.getElementById("turn").textContent=gameOver?"ចប់ការប្រកួត":`វេន៖ ${sideName(turn)}`;
  document.getElementById("status").textContent=inCheck(turn)&&!gameOver?"⚠️ ជាប់អុក":"លេងតាមវេន";
  document.getElementById("whiteCount").textContent=kh(countSide(W));
  document.getElementById("blackCount").textContent=kh(countSide(B));
}
function countSide(s){let n=0;for(const row of board)for(const p of row)if(p?.side===s)n++;return n}
function message(t){document.getElementById("message").textContent=t}
document.getElementById("restart").onclick=setup;
setup();
