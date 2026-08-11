let currentUser = null;

function playerIdFromUid(uid){
  return "KH-" + String(uid || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase()
    .padEnd(8, "0");
}

async function ensureUserProfile(user){
  if(!user || !window.khmerGameAuth?.db) return null;

  const ref = window.khmerGameAuth.db.collection("users").doc(user.uid);
  const snap = await ref.get();

  if(!snap.exists){
    const profile = {
      name: user.displayName || user.email?.split("@")[0] || "អ្នកលេង",
      playerId: playerIdFromUid(user.uid),
      coins: 5000,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      totalGames: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(profile);
    return profile;
  }

  return snap.data();
}

function updateProfileStats(data){
  data = data || {};
  const set = (id, value) => {
    const el = document.getElementById(id);
    if(el) el.textContent = value;
  };

  set("statGames", data.totalGames ?? 0);
  set("statWins", data.wins ?? 0);
  set("statDraws", data.draws ?? 0);
  set("statLosses", data.losses ?? 0);
  set("profileCoins", `${data.coins ?? 0} ៛`);
  set("profilePoints", data.points ?? 0);
}

async function setUser(user){
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

    try{
      const data = await ensureUserProfile(user);
      updateProfileStats(data);
    }catch(error){
      console.error("Profile load/create error:", error);
    }
  }else{
    if(name) name.textContent = "អ្នកលេង";
    if(id) id.textContent = "មិនទាន់ចូលគណនី";
    if(email) email.textContent = "";
    if(avatar) avatar.textContent = "👤";
    if(guest) guest.style.display = "block";
    if(logged) logged.style.display = "none";
    updateProfileStats({});
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
    const db = firebase.firestore();

    window.khmerGameAuth = {
      auth: auth,
      db: db,
      getUser: () => currentUser,
      playerId: playerIdFromUid,
      ensureUserProfile: ensureUserProfile
    };

    auth.onAuthStateChanged(setUser);
  }catch(error){
    console.error("Firebase initialization error:", error);
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", initKhmerGameAuth);
}else{
  initKhmerGameAuth();
}
