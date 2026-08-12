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
 set("profileCoins",`${d.coins??0} ៛`);set("profilePoints",d.points??0);
 const c=document.getElementById("headerCoinsValue"),r=document.getElementById("headerRankValue");
 if(c)c.textContent=Number(d.coins??0).toLocaleString();if(r)r.textContent=Number(d.points??0).toLocaleString();
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
 try{if(!firebase.apps.length)firebase.initializeApp(window.firebaseConfig);const auth=firebase.auth(),db=firebase.firestore();window.khmerGameAuth={auth,db,getUser:()=>currentUser,ensureUserProfile};auth.onAuthStateChanged(setUser)}catch(e){console.error(e)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initKhmerGameAuth);else initKhmerGameAuth();
