// KhmerGame Phase 2 — Account/Auth scaffold
// Put your Firebase Web config in firebase-config.js.
// This file is intentionally separated so game logic stays untouched.

let currentUser = null;

function setUser(user){
  currentUser = user || null;
  const name = document.getElementById("profileName");
  const id = document.getElementById("profileId");
  const avatar = document.getElementById("profileAvatar");
  if(!name) return;
  if(user){
    name.textContent = user.displayName || user.email?.split("@")[0] || "អ្នកលេង";
    id.textContent = "ID: " + (user.uid || "KH-000001").slice(0,12);
    if(avatar) avatar.textContent = "👤";
  }else{
    name.textContent = "អ្នកលេង";
    id.textContent = "ID: KH-000001";
  }
}

window.khmerGameAuth = {
  getUser: ()=>currentUser,
  setUser
};
