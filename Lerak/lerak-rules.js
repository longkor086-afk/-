/* Lerak rule helpers.
   This keeps the current LERAK-NEW legal-move rules unchanged:
   8x8 board, white first, diagonal men, mandatory captures,
   multi-capture support at the rules level, and king promotion.
*/
(function(){
  const DIRS={
    white:[[1,-1],[1,1]],
    black:[[-1,-1],[-1,1]],
    king:[[1,-1],[1,1],[-1,-1],[-1,1]]
  };
  window.LerakRules={
    inside(r,c){return r>=0&&r<8&&c>=0&&c<8},
    dirs(p){return p.king?DIRS.king:DIRS[p.color]},
    clone(board){return board.map(row=>row.map(p=>p?({...p}):null))},
    captures(board,color){
      const out=[];
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const p=board[r][c]; if(!p||p.color!==color)continue;
        for(const [dr,dc] of this.dirs(p)){
          const mr=r+dr,mc=c+dc,tr=r+2*dr,tc=c+2*dc;
          if(this.inside(tr,tc)&&board[mr]?.[mc]&&board[mr][mc].color!==color&&!board[tr][tc])
            out.push({from:[r,c],to:[tr,tc],over:[mr,mc]});
        }
      }
      return out;
    },
    moves(board,color){
      const caps=this.captures(board,color);
      if(caps.length)return caps;
      const out=[];
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const p=board[r][c]; if(!p||p.color!==color)continue;
        for(const [dr,dc] of this.dirs(p)){
          const nr=r+dr,nc=c+dc;
          if(this.inside(nr,nc)&&!board[nr][nc])out.push({from:[r,c],to:[nr,nc]});
        }
      }
      return out;
    },
    apply(board,move){
      const b=this.clone(board),[r,c]=move.from,[nr,nc]=move.to,p=b[r][c];
      b[r][c]=null;b[nr][nc]=p;
      if(move.over)b[move.over[0]][move.over[1]]=null;
      if((p.color==='white'&&nr===7)||(p.color==='black'&&nr===0))p.king=true;
      return b;
    },
    hasAny(board,color){return this.moves(board,color).length>0}
  };
})();
