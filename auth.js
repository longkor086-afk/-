let currentUser = null;

function playerIdFromUid(uid){
  return "KH-" + String(uid || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase()
    .padEnd(8, "0");
}

function setUser(user){
  currentUser = user || null;

  const name = document.getElementById("profileName");
  const id = document.getElementById("profileId");
  const avatar = document.getElementById("profileAvatar");
  const guest = document.getElementById("profileGuest");
  const logged = document.getElementById("profileUser");
  const email = document.getElementById("profileEmail");

  if(user){
    if(name) name.textContent = user.displayName || user.email?.split("@")[0] || "អ្នកលេង";
    if(id) id.textContent = "ID: " + playerIdFromUid(user.uid);
    if(email) email.textContent = user.email || "";
    if(avatar) avatar.textContent = "👤";
    if(guest) guest.style.display = "none";
    if(logged) logged.style.display = "block";
  }else{
    if(name) name.textContent = "អ្នកលេង";
    if(id) id.textContent = "មិនទាន់ចូលគណនី";
    if(email) email.textContent = "";
    if(avatar) avatar.textContent = "👤";
    if(guest) guest.style.display = "block";
    if(logged) logged.style.display = "none";
  }
}

function initKhmerGameAuth(){
  if(!window.firebase){
    console.error("Firebase SDK មិនបាន load");
    return;
  }

  if(!window.firebaseConfig){
    console.error("firebaseConfig មិនបាន load");
    return;
  }

  try{
    if(!firebase.apps.length){
      firebase.initializeApp(window.firebaseConfig);
    }

    const auth = firebase.auth();

    window.khmerGameAuth = {
      auth: auth,
      getUser: () => currentUser,
      playerId: playerIdFromUid
    };

    auth.onAuthStateChanged(setUser);
  }catch(error){
    console.error("Firebase initialization error:", error);
  }
}

/* Run reliably whether this file loads before or after window load */
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", initKhmerGameAuth);
}else{
  initKhmerGameAuth();
}