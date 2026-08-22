(function(){
  function scoreMove(board,m){
    const next=LerakRules.apply(board,m);
    let score=m.captures.length*30;
    if(m.rek)score+=25;
    if(m.trap)score+=20;
    if(!LerakRules.kingAlive(next,"white"))score+=10000;
    // Prefer moves that give the bot more mobility.
    score+=LerakRules.moves(next,"black").length*0.2;
    return score;
  }
  window.LerakBot={
    choose(board,color){
      const ms=LerakRules.moves(board,color);
      if(!ms.length)return null;
      let best=-Infinity,choices=[];
      for(const m of ms){
        const s=scoreMove(board,m)+(Math.random()*3);
        if(s>best){best=s;choices=[m]}
        else if(s===best)choices.push(m);
      }
      return choices[Math.floor(Math.random()*choices.length)];
    }
  };
})();
