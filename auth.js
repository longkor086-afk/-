let currentUser=null;
function playerIdFromUid(uid){return "KH-"+String(uid||"").replace(/[^a-zA-Z0-9]/g,"").slice(0,8).toUpperCase().padEnd(8,"0");}
function setUser(user){
 currentUser=user||null;
 const n=document.getElementById("profileName"),i=document.getElementById("profileId"),a=document.getElementById("profileAvatar"),g=document.getElementById("profileGuest"),u=document.getElementById("profileUser"),e=document.getElementById("profileEmail");
 if(user){if(n)n.textContent=user.displayName||user.email?.split("@")[0]||"អ្នកលេង";if(i)i.textContent="ID: "+playerIdFromUid(user.uid);if(e)e.textContent=user.email||"";if(a)a.textContent="👤";if(g)g.style.display="none";if(u)u.style.display="block";}
 else{if(n)n.textContent="អ្នកលេង";if(i)i.textContent="មិនទាន់ចូលគណនី";if(e)e.textContent="";if(a)a.textContent="👤";if(g)g.style.display="block";if(u)u.style.display="none";}
}
function initKhmerGameAuth(){
 if(!window.firebase||!window.firebaseConfig)return;
 if(!firebase.apps.length)firebase.initializeApp(firebaseConfig);
 const auth=firebase.auth();
 window.khmerGameAuth={auth,getUser:()=>currentUser,playerId:playerIdFromUid,setUser};
 auth.onAuthStateChanged(setUser);
}
window.addEventListener("load",initKhmerGameAuth);