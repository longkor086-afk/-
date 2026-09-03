/* Local Bot fallback. */
(function(){
  window.LerakBot={
    choose(board,color){
      const moves=LerakRules.moves(board,color);
      if(!moves.length)return null;
      const captures=LerakRules.captures(board,color);
      const pool=captures.length?captures:moves;
      return pool[Math.floor(Math.random()*pool.length)];
    }
  };
})();
