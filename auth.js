let currentUser=null;
function playerIdFromUid(uid){return "KH-"+String(uid||"").replace(/[^a-zA-Z0-9]/g,"").slice(0,8).toUpperCase().padEnd(8,"0");}
async function ensureUserProfile(user){
 if(!user||!window.khmerGameAuth?.db)return null;
 const ref=window.khmerGameAuth.db.collection("users").doc(user.uid), snap=await ref.get();
 if(!snap.exists){
  const p={name:user.displayName||user.email?.split("@")[0]||"អ្នកលេង",playerId:user.uid,coins:0,points:0,wins:0,draws:0,losses:0,totalGames:0,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
  await ref.set(p); return p;
 }
 return snap.data();
}
function updateProfileStats(d){
 d=d||{}; const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
 set("statGames",d.totalGames??0);set("statWins",d.wins??0);set("statDraws",d.draws??0);set("statLosses",d.losses??0);
 set("profileCoins",`${Number(d.coins??0).toLocaleString()} Coins`);set("profilePoints",Number(d.points??0).toLocaleString());
 const c=document.getElementById("headerCoinsValue"),r=document.getElementById("headerRankValue");
 if(c)c.textContent=Number(d.coins??0).toLocaleString();
 if(r)r.textContent=Number(d.points??0).toLocaleString();
}
function ensureHeaderHud(){
 const top=document.querySelector(".topbar");
 if(!top || document.getElementById("headerHud")) return;
 const hud=document.createElement("div");
 hud.id="headerHud"; hud.className="header-hud";
 hud.innerHTML=`<button class="hud-pill" onclick="openShop()" title="Coins"><span>🪙</span><b id="headerCoinsValue">0</b></button>
 <button class="hud-pill" onclick="showPage('ranking')" title="ចំណាត់ថ្នាក់"><span>🏆</span><b id="headerRankValue">0</b></button>
 <button class="hud-icon" onclick="openMessagesHistory()" title="សារ">💬<i id="messagesBadge"></i></button>`;
 const avatar=top.querySelector(".avatar-btn");
 if(avatar) top.insertBefore(hud,avatar); else top.appendChild(hud);
 const style=document.createElement("style"); style.id="khmer-header-style";
 style.textContent=`.topbar{gap:8px;flex-wrap:nowrap}.header-hud{display:flex;align-items:center;gap:5px;margin-left:auto}
 .hud-pill,.hud-icon{border:1px solid var(--line);background:#ffffff08;color:var(--text);border-radius:13px;height:40px;display:flex;align-items:center;justify-content:center}
 .hud-pill{padding:0 8px;gap:4px;min-width:62px;font-size:10px}.hud-pill span{font-size:14px}.hud-pill b{color:var(--gold2);font-size:9px;max-width:45px;overflow:hidden;text-overflow:ellipsis}
 .hud-icon{position:relative;width:40px;font-size:17px}.hud-icon i{display:none;position:absolute;right:2px;top:1px;min-width:14px;height:14px;padding:0 3px;border-radius:9px;background:#e7b84b;color:#111;font:700 8px/14px system-ui;font-style:normal}.hud-icon i:not(:empty){display:block}
 @media(max-width:430px){.hud-pill{min-width:50px;padding:0 5px}.hud-pill span{font-size:12px}.hud-pill b{font-size:8px}.hud-icon{width:36px}.avatar-btn{width:38px!important;height:38px!important}}`;
 document.head.appendChild(style);
}
function ensureMessagesModal(){
 if(document.getElementById("messagesModal")) return;
 const wrap=document.createElement("div");
 wrap.innerHTML=`<div id="messagesModal" class="mh-modal" aria-hidden="true"><div class="mh-box"><button class="mh-close" onclick="closeMessagesHistory()">×</button><div class="mh-title"><span>💬</span><div><span class="eyebrow">MESSAGES</span><h2>សារ & ប្រវត្តិ Top Up</h2></div></div><div id="messagesHistory" class="messages-history"><div class="mh-empty">⏳ កំពុងផ្ទុក...</div></div></div></div>`;
 document.body.appendChild(wrap.firstElementChild);
 const style=document.createElement("style"); style.id="khmer-messages-style";
 style.textContent=`.mh-modal{position:fixed;inset:0;background:#0009;display:none;align-items:flex-end;justify-content:center;z-index:9999;padding:10px}.mh-modal.show{display:flex}
 .mh-box{width:min(620px,100%);max-height:82vh;overflow:auto;background:#151518;border:1px solid var(--line);border-radius:22px 22px 14px 14px;padding:18px;color:var(--text);box-shadow:0 20px 60px #000b;position:relative}
 .mh-close{position:absolute;right:14px;top:12px;border:0;background:#ffffff0b;color:var(--text);border-radius:12px;width:38px;height:38px;font-size:27px}
 .mh-title{display:flex;gap:10px;align-items:center;margin:4px 0 14px}.mh-title>span{font-size:28px}.mh-title h2{margin:2px 0 0;font-size:19px}.mh-title .eyebrow{font-size:9px}
 .messages-history{display:grid;gap:8px}.mh-item{display:flex;gap:10px;padding:12px;border:1px solid var(--line);border-radius:15px;background:#ffffff05}.mh-icon{font-size:24px}.mh-content{flex:1}.mh-head{display:flex;justify-content:space-between;gap:8px}.mh-head b{font-size:12px}.mh-head strong{color:var(--gold2);font-size:11px}.mh-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:5px;font-size:9px;color:var(--muted)}.mh-package{display:block;color:var(--muted);font-size:8px;margin-top:5px}.mh-status{font-weight:700}.mh-status.approved{color:#71d69a}.mh-status.rejected{color:#f06d6d}.mh-status.pending{color:#e9c56d}.mh-empty{text-align:center;padding:28px 12px;color:var(--muted)}`;
 document.head.appendChild(style);
 const script=document.createElement("script"); script.src="messages-history.js?v=2"; script.defer=true; document.head.appendChild(script);
}
function ensureLerakEntry(){
 const game=new URLSearchParams(location.search).get("game");
 if(!game || game.toLowerCase()!=="lerak") return;
 const main=document.querySelector("main");
 if(!main || document.getElementById("lerakPage")) return;
 main.innerHTML=`<section id="lerakPage" class="page active"><div class="lerak-head"><button class="lerak-back" onclick="history.back()">← ត្រឡប់</button><div><span class="eyebrow">KHMER GAME</span><h1>🛡️ រែក</h1><small>រែកធម្មតា • រែកព័ទ្ធ</small></div></div>
 <div id="modeMenu" class="lerak-modes"><button onclick="startGameMode('normal')"><b>🛡️ រែកធម្មតា</b><small>លេងតាមច្បាប់រែកធម្មតា</small></button><button onclick="startGameMode('surround')"><b>⚔️ រែកព័ទ្ធ</b><small>ចាប់រែក និងព័ទ្ធ</small></button></div>
 <div id="gameArea" style="display:none"><div class="lerak-info"><b id="turn">វេន៖ ស</b><span>⚪ ស <b id="wc">16</b></span><span>⚫ ខ្មៅ <b id="bc">16</b></span><button id="restart">លេងថ្មី</button></div><div id="board" class="lerak-board"></div><div id="message" class="lerak-message">ជ្រើសកូនអុកមួយ។</div><div class="lerak-help">💡 ជំហានដំបូងនឹងប្រាប់អ្នកថាត្រូវជ្រើសកូនណា។</div></div></section>`;
 const style=document.createElement("style");
 style.textContent=`.lerak-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}.lerak-head h1{margin:2px 0;font-size:25px}.lerak-head small{color:var(--muted)}.lerak-back{border:1px solid var(--line);background:#ffffff08;color:var(--text);border-radius:12px;padding:10px 12px}.lerak-modes{display:grid;gap:10px}.lerak-modes button{padding:17px;text-align:left;border:1px solid var(--line);border-radius:17px;background:#ffffff06;color:var(--text)}.lerak-modes b{display:block;font-size:15px;color:var(--gold2)}.lerak-modes small{display:block;margin-top:5px;color:var(--muted)}.lerak-info{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:8px 0}.lerak-info>*{border:1px solid var(--line);border-radius:10px;padding:8px 9px;background:#ffffff06;font-size:10px}.lerak-info button{color:var(--text)}.lerak-board{width:min(94vw,620px);aspect-ratio:1;margin:10px auto;display:grid;grid-template-columns:repeat(8,1fr);border:5px solid #8d6a31;border-radius:14px;overflow:hidden;box-shadow:0 12px 35px #0008}.lerak-board .cell{border:1px solid #8a6d3f}.lerak-board .cell.light{background:#e2c47e}.lerak-board .cell.dark{background:#a8793f}.lerak-board .cell.selected{box-shadow:inset 0 0 0 4px #4ba3ff}.lerak-board .cell.move::after{background:#4ba3ff!important}.lerak-board .cell.capture::after{border-color:#ff6d6d!important}.lerak-message,.lerak-help{margin:10px 0;padding:12px;border:1px solid var(--line);border-radius:14px;background:#ffffff05}.lerak-help{color:var(--muted);font-size:10px}`;
 document.head.appendChild(style);
 const script=document.createElement("script"); script.src="game.js?v=4"; script.defer=true; document.body.appendChild(script);
}
function installBettingFix(){
 const oldOpen=window.openBetting;
 if(typeof oldOpen!=="function") return;
 window.openBetting=function(){
   const user=window.khmerGameAuth?.getUser?.(); if(!user){oldOpen.apply(this,arguments);return;}
   const stakes=[[1000,900,100],[10000,9500,500],[100000,99000,1000],[1000000,990000,10000],[10000000,9900000,100000]];
   modal(`<span class="eyebrow">BETTING</span><h2>🎮 ជ្រើសការភ្នាល់</h2><p>Coins ត្រូវបានពិនិត្យពី Firebase មុនចូលលេង។</p><div class="cg-list">${stakes.map(s=>`<button class="cg-card" onclick="selectStake(${s[0]})"><span>🪙</span><div><b>${s[0].toLocaleString()} Coins</b><small>ឈ្នះ ${s[1].toLocaleString()} • សេវា ${s[2].toLocaleString()}</small></div><i>›</i></button>`).join("")}</div>`);
 };
 window.selectStake=async function(amount){
   const user=window.khmerGameAuth?.getUser?.(); if(!user){location.href="account.html";return;}
   try{
    const snap=await window.khmerGameAuth.db.collection("users").doc(user.uid).get();
    const balance=Number(snap.exists?snap.data().coins||0:0);
    const s=[[1000,900,100],[10000,9500,500],[100000,99000,1000],[1000000,990000,10000],[10000000,9900000,100000]].find(x=>x[0]===amount);
    const enough=balance>=amount;
    const missing=Math.max(0,amount-balance);
    modal(`<h2>🪙 ${amount.toLocaleString()} Coins</h2><div class="stake-summary"><div><span>ភ្នាល់</span><b>${amount.toLocaleString()}</b></div><div><span>ឈ្នះទទួល</span><b>${s[1].toLocaleString()}</b></div><div><span>សេវា</span><b>${s[2].toLocaleString()}</b></div></div><p>Coins របស់អ្នក៖ <b>${balance.toLocaleString()}</b></p><div class="notice"><b>${enough?"✅ Coins គ្រប់គ្រាន់":"❌ Coins មិនគ្រប់"}</b><p>${enough?"អ្នកអាចបន្តទៅហ្គេមបាន។":"ត្រូវការ "+missing.toLocaleString()+" Coins ទៀត។"}</p></div><button class="primary-btn full-btn" onclick="${enough?`location.href='?game=lerak&stake=${amount}'`:`openShop()`}">${enough?"🎮 ចូលលេង":"🪙 បន្ថែម Coins"}</button>`);
   }catch(e){console.error(e);modal(`<h2>⚠️ មិនអាចពិនិត្យ Coins</h2><p>សូម Refresh ហើយសាកម្ដងទៀត។</p>`);}
 };
}
async function setUser(user){
 currentUser=user||null;
 const g=document.getElementById("profileGuest"),u=document.getElementById("profileUser");
 const n=document.getElementById("profileName"),id=document.getElementById("profileId"),em=document.getElementById("profileEmail");
 if(user){if(n)n.textContent=user.displayName||user.email?.split("@")[0]||"អ្នកលេង";if(id)id.textContent="ID: "+playerIdFromUid(user.uid);if(em)em.textContent=user.email||"";if(g)g.style.display="none";if(u)u.style.display="block";try{updateProfileStats(await ensureUserProfile(user))}catch(e){console.error(e)}}
 else{if(n)n.textContent="អ្នកលេង";if(id)id.textContent="មិនទាន់ចូលគណនី";if(em)em.textContent="";if(g)g.style.display="block";if(u)u.style.display="none";updateProfileStats({})}
}
function initKhmerGameAuth(){
 if(!window.firebase||!window.firebaseConfig){console.error("Firebase មិនទាន់ load");return}
 try{
  if(!firebase.apps.length)firebase.initializeApp(window.firebaseConfig);
  const auth=firebase.auth(),db=firebase.firestore();
  window.khmerGameAuth={auth,db,getUser:()=>currentUser,ensureUserProfile};
  auth.onAuthStateChanged(setUser);
  const boot=()=>{ensureHeaderHud();ensureMessagesModal();ensureLerakEntry();setTimeout(installBettingFix,0)};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
 }catch(e){console.error(e)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initKhmerGameAuth);else initKhmerGameAuth();
