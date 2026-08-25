// Khmer Ouk 2D reference-style board.
// The piece artwork is kept as separate symbols so each type is visually distinct.
const PIECES = {
  rook:   { white:"♜", black:"♜" },
  knight: { white:"♞", black:"♞" },
  bishop: { white:"♝", black:"♝" },
  king:   { white:"♚", black:"♚" },
  queen:  { white:"♛", black:"♛" }
};

// Visual arrangement based on the supplied reference.
// Main purpose here is a clean, stable 8x8 renderer with selectable pieces and movement animation.
let board = [
  ["br","bn","bb","bq","bk","bb","bn","br"],
  [null,null,null,null,null,null,null,null],
  ["bp","bp","bp","bp","bp","bp","bp","bp"],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ["wp","wp","wp","wp","wp","wp","wp","wp"],
  [null,null,null,null,null,null,null,null],
  ["wr","wn","wb","wq","wk","wb","wn","wr"]
];

const names = {p:"pawn",r:"rook",n:"knight",b:"bishop",q:"queen",k:"king"};
const boardEl = document.getElementById("board");
let selected = null, last = null;

function glyph(type,color){
  const map = {
    r: color==="w" ? "♜":"♜",
    n: color==="w" ? "♞":"♞",
    b: color==="w" ? "♝":"♝",
    q: color==="w" ? "♛":"♛",
    k: color==="w" ? "♚":"♚",
    p: color==="w" ? "♙":"♟"
  };
  return map[type];
}
function render(){
  boardEl.innerHTML="";
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const sq=document.createElement("div");
    sq.className="square "+((r+c)%2===0?"light":"dark");
    sq.dataset.r=r;sq.dataset.c=c;
    if(selected && selected.r===r && selected.c===c) sq.classList.add("selected");
    if(last && last.r===r && last.c===c) sq.classList.add("last");
    const p=board[r][c];
    if(p){
      const el=document.createElement("div");
      el.className="piece "+(p[0]==="w"?"white":"black");
      el.textContent=glyph(p[1],p[0]);
      sq.appendChild(el);
    }
    sq.addEventListener("click",()=>tap(r,c));
    boardEl.appendChild(sq);
  }
}
function tap(r,c){
  const p=board[r][c];
  if(selected){
    if(selected.r===r && selected.c===c){selected=null;render();return}
    const moving=board[selected.r][selected.c];
    if(moving){
      board[r][c]=moving; board[selected.r][selected.c]=null;
      last={r,c}; selected=null; render();
      const sq=[...boardEl.children][r*8+c], piece=sq.querySelector(".piece");
      if(piece){piece.classList.remove("moving"); void piece.offsetWidth; piece.classList.add("moving")}
      return;
    }
    selected=null;render();return;
  }
  if(p){selected={r,c};render();}
}
document.getElementById("reset").onclick=()=>{
  board=[
    ["br","bn","bb","bq","bk","bb","bn","br"],
    [null,null,null,null,null,null,null,null],
    ["bp","bp","bp","bp","bp","bp","bp","bp"],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ["wp","wp","wp","wp","wp","wp","wp","wp"],
    [null,null,null,null,null,null,null,null],
    ["wr","wn","wb","wq","wk","wb","wn","wr"]
  ]; selected=null;last=null;render();
};
render();
