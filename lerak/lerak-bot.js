/* Simple local bot fallback.
   Matchmaking waits 30 seconds in the main game. If no human opponent is
   connected, this bot takes over. It uses legal moves and prefers captures. */
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