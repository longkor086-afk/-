let currentUser = null;

function playerIdFromUid(uid){
  return "KH-" + String(uid || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase()
    .padEnd(8, "0");
}

function ensureWalletUI(){
  const topbar = document.querySelector(".topbar");
  if(!topbar || document.getElementById("headerWallet")) return;

  const avatarBtn = topbar.querySelector(".avatar-btn");
  if(!avatarBtn) return;

  const wallet = document.createElement("div");
  wallet.id = "headerWallet";
  wallet.innerHTML = `
    <button class="wallet-item" id="headerCoins" title="Coins">
      <span class="wallet-icon">🪙</span>
      <span class="wallet-value" id="headerCoinsValue">0</span>
      <b class="wallet-plus">+</b>
    </button>
    <button class="wallet-item" id="headerRank" title="Rank">
      <span class="wallet-icon">🏆</span>
      <span class="wallet-value" id="headerRankValue">0</span>
    </button>
  `;

  topbar.insertBefore(wallet, avatarBtn);

  const style = document.createElement("style");
  style.id = "headerWalletStyle";
  style.textContent = `
    .topbar{gap:8px}
    #headerWallet{margin-left:auto;display:flex;align-items:center;gap:5px}
    .wallet-item{height:38px;display:flex;align-items:center;gap:4px;padding:0 8px;border:1px solid #ffffff12;border-radius:12px;background:#ffffff08;color:#f6f0e6;font:inherit;cursor:pointer;white-space:nowrap}
    .wallet-icon{font-size:15px;line-height:1}
    .wallet-value{font-size:11px;font-weight:800;color:#f0ce80;max-width:58px;overflow:hidden;text-overflow:ellipsis}
    .wallet-plus{font-size:15px;color:#f0ce80;line-height:1}
    #headerRank .wallet-value{min-width:14px;text-align:center}
    .wallet-item:active{transform:scale(.96)}
    @media(max-width:420px){
      #headerWallet{gap:3px}
      .wallet-item{height:36px;padding:0 6px;border-radius:11px}
      .wallet-value{font-size:10px;max-width:48px}
      .wallet-icon{font-size:14px}
      .wallet-plus{font-size:14px}
    }
  `;
  document.head.appendChild(style);

  document.getElementById("headerCoins").onclick = () => {
    alert("🪙 Coins\n\nប៊ូតុង + សម្រាប់បន្ថែម Coins នឹងភ្ជាប់នៅពេលប្រព័ន្ធទិញ Coins ត្រូវបានបង្កើត។");
  };
}

function updateHeaderWallet(data){
  const coins = document.getElementById("headerCoinsValue");
  const rank = document.getElementById("headerRankValue");
  if(coins) coins.textContent = Number(data?.coins ?? 0).toLocaleString();
  if(rank) rank.textContent = Number(data?.points ?? 0).toLocaleString();
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
  updateHeaderWallet(data);
}

async function setUser(user){
  currentUser = user || null;
  ensureWalletUI();

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
      updateHeaderWallet({coins: 0, points: 0});
    }
  }else{
    if(name) name.textContent = "អ្នកលេង";
    if(id) id.textContent = "មិនទាន់ចូលគណនី";
    if(email) email.textContent = "";
    if(avatar) avatar.textContent = "👤";
    if(guest) guest.style.display = "block";
    if(logged) logged.style.display = "none";
    updateProfileStats({coins: 0, points: 0});
  }
}

function initKhmerGameAuth(){
  ensureWalletUI();

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
