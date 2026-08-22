/*
  LERAK V2 RULE ENGINE
  Basis:
  - 8x8 uncheckered board.
  - Each side: 1 King + 15 Men.
  - Men: 7 on the first row + 8 on the third row.
  - King: far-left second row for White; far-right second row for Black.
  - All pieces move orthogonally like a rook, any unobstructed distance.
  - Two capture mechanisms:
      1) Intervention ("Rek"): land between two enemy pieces one square apart
         on the same row/column; both are removed.
      2) Modified custodian: an enemy piece/group is removed if, after the
         move, every piece in that connected enemy group has no legal rook move.
  - Goal: capture the opponent's King.
*/
(function(){
  const D=[[1,0],[-1,0],[0,1],[0,-1]];
  const inside=(r,c)=>r>=0&&r<8&&c>=0&&c<8;

  function emptyBoard(){return Array.from({length:8},()=>Array(8).fill(null))}

  function initial(){
    const b=emptyBoard();
    // White: bottom side. 7 men on row 7, 8 men on row 5.
    for(let c=0;c<8;c++) if(c!==0) b[7][c]={color:"white",king:false};
    for(let c=0;c<8;c++) b[5][c]={color:"white",king:false};
    b[6][0]={color:"white",king:true};

    // Black: top side, mirrored. 7 men on row 0, 8 men on row 2.
    for(let c=0;c<8;c++) if(c!==7) b[0][c]={color:"black",king:false};
    for(let c=0;c<8;c++) b[2][c]={color:"black",king:false};
    b[1][7]={color:"black",king:true};
    return b;
  }

  function clone(b){return b.map(row=>row.map(p=>p?({...p}):null))}
  function pathClear(b,r,c,nr,nc){
    const dr=Math.sign(nr-r),dc=Math.sign(nc-c);
    if(dr!==0&&dc!==0)return false;
    let x=r+dr,y=c+dc;
    while(x!==nr||y!==nc){
      if(b[x][y])return false;
      x+=dr;y+=dc;
    }
    return true;
  }

  function slideMoves(b,r,c){
    const out=[];
    for(const [dr,dc] of D){
      let nr=r+dr,nc=c+dc;
      while(inside(nr,nc)&&!b[nr][nc]){
        out.push({from:[r,c],to:[nr,nc],type:"move",captures:[]});
        nr+=dr;nc+=dc;
      }
    }
    return out;
  }

  // A move "Reks" when the destination is the single empty square
  // between two enemy pieces on a row or column.
  function interventionCaptures(b,color,r,c){
    const out=[];
    const enemy=color==="white"?"black":"white";
    for(const [dr,dc] of D){
      const r1=r+dr,c1=c+dc,r2=r-dr,c2=c-dc;
      if(inside(r1,c1)&&inside(r2,c2)&&
         b[r1][c1]?.color===enemy&&b[r2][c2]?.color===enemy){
        out.push([r1,c1],[r2,c2]);
      }
    }
    // unique
    return out.filter((v,i,a)=>a.findIndex(x=>x[0]===v[0]&&x[1]===v[1])===i);
  }

  function groups(b,color){
    const seen=Array.from({length:8},()=>Array(8).fill(false)), out=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      if(seen[r][c]||b[r][c]?.color!==color)continue;
      const q=[[r,c]],g=[];seen[r][c]=true;
      while(q.length){
        const [x,y]=q.shift();g.push([x,y]);
        for(const [dr,dc] of D){
          const nx=x+dr,ny=y+dc;
          if(inside(nx,ny)&&!seen[nx][ny]&&b[nx][ny]?.color===color){
            seen[nx][ny]=true;q.push([nx,ny]);
          }
        }
      }
      out.push(g);
    }
    return out;
  }

  // A group is trapped if none of its pieces has a rook path to an empty square.
  function groupTrapped(b,g){
    for(const [r,c] of g){
      for(const [dr,dc] of D){
        let nr=r+dr,nc=c+dc;
        while(inside(nr,nc)){
          if(!b[nr][nc]) return false;
          nr+=dr;nc+=dc;
        }
      }
    }
    return true;
  }

  function custodianCaptures(after,color){
    const enemy=color==="white"?"black":"white", removed=[];
    for(const g of groups(after,enemy)){
      if(groupTrapped(after,g)) removed.push(...g);
    }
    return removed;
  }

  function simulateMove(b,m){
    const n=clone(b),p=n[m.from[0]][m.from[1]];
    n[m.from[0]][m.from[1]]=null;
    n[m.to[0]][m.to[1]]=p;
    for(const [r,c] of m.captures)n[r][c]=null;
    return n;
  }

  function movesFor(b,color){
    const out=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const p=b[r][c]; if(!p||p.color!==color)continue;
      for(const m of slideMoves(b,r,c)){
        // The destination itself must be empty by slideMoves.
        const ic=interventionCaptures(b,color,m.to[0],m.to[1]);
        let n=simulateMove(b,{...m,captures:ic});
        const cc=custodianCaptures(n,color);
        const captures=ic.concat(cc.filter(x=>!ic.some(y=>y[0]===x[0]&&y[1]===x[1])));
        const type=captures.length?"capture":"move";
        out.push({...m,captures,type,rek:ic.length>0,trap:cc.length>0});
      }
    }
    return out;
  }

  function apply(b,m){
    const n=simulateMove(b,m);
    const p=n[m.to[0]][m.to[1]];
    // Safety: if the opponent king is captured, it is simply absent.
    return n;
  }

  function kingAlive(b,color){
    for(const row of b)for(const p of row)if(p?.color===color&&p.king)return true;
    return false;
  }

  function count(b,color){
    let n=0;for(const row of b)for(const p of row)if(p?.color===color)n++;return n;
  }

  function legalDestinations(b,color,from){
    return movesFor(b,color).filter(m=>m.from[0]===from[0]&&m.from[1]===from[1]);
  }

  window.LerakRules={
    initial,clone,moves:movesFor,apply,kingAlive,count,legalDestinations,
    interventionCaptures,custodianCaptures,inside
  };
})();
