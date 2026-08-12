
/* KHMER GAME V3 — 3:00 + 2s increment chess-style clock
   Used by Lerak. The 30s matchmaking wait is separate.
*/
(function(){
  const MAIN=180000, INC=2000;
  let w=MAIN,b=MAIN,lastSide=null,lastTick=0,handle=null,started=false,ended=false;

  function el(id){return document.getElementById(id)}
  function fmt(ms){
    ms=Math.max(0,ms);
    const s=Math.ceil(ms/1000), m=Math.floor(s/60), sec=s%60;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  }
  function inject(){
    const area=el("gameArea"), info=area?.querySelector(".lerak-info");
    if(!area||!info||el("lerakClock"))return;
    const box=document.createElement("div");
    box.id="lerakClock";box.className="lerak-clock";
    box.innerHTML=`<div id="clockWhite" class="clock"><small>⚪ ភាគីស</small><b>03:00</b></div>
      <div class="mode">3:00 + 2s<br>ក្នុងមួយចលនា</div>
      <div id="clockBlack" class="clock"><small>⚫ ភាគីខ្មៅ</small><b>03:00</b></div>`;
    info.parentNode.insertBefore(box,info.nextSibling);
  }
  function side(){try{return turn}catch(e){return null}}
  function paint(){
    inject();
    const cw=el("clockWhite"),cb=el("clockBlack"); if(!cw||!cb)return;
    cw.querySelector("b").textContent=fmt(w); cb.querySelector("b").textContent=fmt(b);
    cw.classList.toggle("active",side()==="white");cb.classList.toggle("active",side()==="black");
    cw.classList.toggle("danger",w<=30000);cb.classList.toggle("danger",b<=30000);
  }
  function stop(){if(handle){clearInterval(handle);handle=null}}
  function start(){
    if(handle)clearInterval(handle);
    lastSide=side();lastTick=Date.now();started=true;ended=false;
    handle=setInterval(tick,100);
    paint();
  }
  function tick(){
    if(ended||gameOver){stop();return}
    const s=side(),now=Date.now(),dt=now-lastTick;lastTick=now;
    if(!started||!s)return;
    if(s==="white")w=Math.max(0,w-dt);else if(s==="black")b=Math.max(0,b-dt);
    paint();
    if(w<=0||b<=0){
      ended=true;stop();gameOver=true;
      const loser=w<=0?"white":"black",winner=loser==="white"?"black":"white";
      try{message(`⏱️ ${winner==="white"?"ភាគីស":"ភាគីខ្មៅ"} ឈ្នះដោយពេលវេលាអស់។`)}catch(e){}
      try{render()}catch(e){}
    }
  }
  function onMoveBoundary(){
    const s=side();
    if(lastSide && s && s!==lastSide){
      if(lastSide==="white")w=Math.min(MAIN,w+INC);else b=Math.min(MAIN,b+INC);
      lastSide=s;lastTick=Date.now();
    }
    paint();
  }
  function wrap(name,cb){
    const original=window[name];
    if(typeof original!=="function")return;
    window[name]=function(){
      const before=side();
      const r=original.apply(this,arguments);
      cb(before);
      return r;
    };
  }
  function boot(){
    if(typeof window.reset!=="function" || typeof window.render!=="function"){setTimeout(boot,100);return;}
    inject();
    // reset starts a fresh clock
    wrap("reset",()=>{w=MAIN;b=MAIN;setTimeout(start,0)});
    // render is called after successful moves in the existing game
    wrap("render",()=>{if(started)onMoveBoundary()});
    setTimeout(start,150);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
