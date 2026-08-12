/* KHMER GAME — Admin Panel — Secure Top Up Admin Logic */
const ADMIN_EMAIL = "longkor168@gmail.com";

let auth = null;
let db = null;
let unsubscribe = null;

const $ = id => document.getElementById(id);

function money(n) {
  return "$" + Number(n || 0).toFixed(2);
}

function coins(n) {
  return Number(n || 0).toLocaleString();
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

function showLogin(msg = "សូម Login ដើម្បីបន្ត") {
  $("loginState").classList.remove("hidden");
  $("adminState").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
  $("loginMsg").textContent = msg;
}

function showAdmin(user) {
  $("loginState").classList.add("hidden");
  $("adminState").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  $("adminEmail").textContent = user.email || "-";
}

function isAdmin(user) {
  return !!user &&
    (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

async function loginEmailPassword(e) {
  e.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) return;

  $("loginMsg").textContent = "⏳ កំពុង Login...";

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);

    if (!isAdmin(result.user)) {
      await auth.signOut();
      showLogin("❌ Email នេះមិនមែនជា Admin account ទេ។");
    }
  } catch (err) {
    console.error(err);

    let msg = "❌ Login មិនជោគជ័យ។";

    if (err.code === "auth/user-not-found") {
      msg = "❌ មិនមាន Admin account នេះទេ។";
    } else if (err.code === "auth/wrong-password") {
      msg = "❌ Password មិនត្រឹមត្រូវ។";
    } else if (err.code === "auth/invalid-credential") {
      msg = "❌ Email ឬ Password មិនត្រឹមត្រូវ។";
    } else if (err.code === "auth/invalid-email") {
      msg = "❌ Email មិនត្រឹមត្រូវ។";
    }

    showLogin(msg);
  }
}

async function loginGoogle() {
  $("loginMsg").textContent = "⏳ កំពុងបើក Google Login...";

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await auth.signInWithPopup(provider);

    if (!isAdmin(result.user)) {
      await auth.signOut();
      showLogin("❌ Google account នេះមិនមែនជា Admin account ទេ។");
    }
  } catch (err) {
    console.error(err);

    if (err.code === "auth/popup-closed-by-user") {
      showLogin("Login ត្រូវបានបិទ។");
    } else if (err.code === "auth/popup-blocked") {
      showLogin("❌ Browser បានរារាំង Google Login Popup។");
    } else if (err.code === "auth/unauthorized-domain") {
      showLogin("❌ Domain នេះមិនទាន់បានដាក់ក្នុង Firebase Authorized Domains។");
    } else {
      showLogin("❌ Google Login មិនជោគជ័យ។");
    }
  }
}

/*
  Approve:
  - Reads transaction + user inside one Firestore transaction.
  - Only a pending topup can be approved.
  - Coins are increased exactly once because the transaction status
    must still be "pending" when Firestore commits.
*/
async function approve(id) {
  if (!auth.currentUser || !isAdmin(auth.currentUser)) {
    alert("❌ សូម Login ជា Admin មុន។");
    return;
  }

  if (!confirm("Approve ហើយបន្ថែម Coins មែនទេ?")) return;

  try {
    await db.runTransaction(async tx => {
      const trRef = db.collection("transactions").doc(id);
      const trSnap = await tx.get(trRef);

      if (!trSnap.exists) {
        throw new Error("Transaction មិនមានទៀតទេ។");
      }

      const t = trSnap.data();

      if (t.type !== "topup") {
        throw new Error("Transaction ប្រភេទមិនត្រឹមត្រូវ។");
      }

      if (t.status !== "pending") {
        throw new Error("Transaction នេះត្រូវបានដំណើរការរួចហើយ។");
      }

      const userId = String(t.userId || "").trim();
      const topupCoins = Number(t.coins || 0);

      if (!userId) {
        throw new Error("Transaction មិនមាន User ID។");
      }

      if (!Number.isFinite(topupCoins) || topupCoins <= 0) {
        throw new Error("ចំនួន Coins ក្នុង Transaction មិនត្រឹមត្រូវ។");
      }

      const userRef = db.collection("users").doc(userId);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists) {
        throw new Error("User Profile មិនមានទេ។");
      }

      const u = userSnap.data();
      const oldCoins = Number(u.coins || 0);

      if (!Number.isFinite(oldCoins) || oldCoins < 0) {
        throw new Error("Coin balance របស់ User មិនត្រឹមត្រូវ។");
      }

      tx.update(userRef, {
        coins: oldCoins + topupCoins
      });

      tx.update(trRef, {
        status: "approved",
        processedAt: firebase.firestore.FieldValue.serverTimestamp(),
        processedBy: auth.currentUser.uid,
        processedByEmail: auth.currentUser.email || ADMIN_EMAIL,
        approvedCoins: topupCoins
      });
    });

    alert("✅ Approve ជោគជ័យ — Coins បានបន្ថែម។");
    watchRequests();
  } catch (e) {
    console.error(e);
    alert("❌ " + (e.message || "មិនអាច Approve បាន"));
    watchRequests();
  }
}

/*
  Reject:
  - Only pending transactions can be rejected.
  - No coins are added.
*/
async function reject(id) {
  if (!auth.currentUser || !isAdmin(auth.currentUser)) {
    alert("❌ សូម Login ជា Admin មុន។");
    return;
  }

  if (!confirm("Reject Top Up Request នេះមែនទេ?")) return;

  try {
    const trRef = db.collection("transactions").doc(id);
    const snap = await trRef.get();

    if (!snap.exists) {
      throw new Error("Transaction មិនមានទៀតទេ។");
    }

    const t = snap.data();

    if (t.type !== "topup") {
      throw new Error("Transaction ប្រភេទមិនត្រឹមត្រូវ។");
    }

    if (t.status !== "pending") {
      throw new Error("Transaction នេះត្រូវបានដំណើរការរួចហើយ។");
    }

    await trRef.update({
      status: "rejected",
      processedAt: firebase.firestore.FieldValue.serverTimestamp(),
      processedBy: auth.currentUser.uid,
      processedByEmail: auth.currentUser.email || ADMIN_EMAIL
    });

    alert("✅ Reject ជោគជ័យ។");
    watchRequests();
  } catch (e) {
    console.error(e);
    alert("❌ " + (e.message || "មិនអាច Reject បាន"));
    watchRequests();
  }
}

window.approve = approve;
window.reject = reject;

function render(docs) {
  const box = $("requests");

  const topups = docs.filter(s => {
    const d = s.data();
    return d.type === "topup" && d.status === "pending";
  });

  $("pendingCount").textContent = topups.length;

  if (!topups.length) {
    box.innerHTML =
      '<div class="empty">🎉 មិនមាន Pending Top Up ទេ</div>';
    return;
  }

  box.innerHTML = topups.map(s => {
    const d = s.data();

    return `<article class="item">
      <div class="item-head">
        <b>🪙 ${coins(d.coins)} Coins</b>
        <b>${money(d.amount)}</b>
      </div>

      <div class="muted">
        User: ${esc(d.userId)}<br>
        Package: ${esc(d.packageId)}<br>
        Transaction: ${esc(s.id)}<br>
        Status: <b>${esc(d.status)}</b>
      </div>

      <div class="actions">
        <button class="gold" onclick="approve('${esc(s.id)}')">
          ✅ Approve
        </button>
        <button class="danger" onclick="reject('${esc(s.id)}')">
          ❌ Reject
        </button>
      </div>
    </article>`;
  }).join("");
}

function watchRequests() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  unsubscribe = db.collection("transactions")
    .where("status", "==", "pending")
    .onSnapshot(
      snap => render(snap.docs),
      err => {
        console.error(err);

        $("requests").innerHTML =
          '<div class="empty">❌ មិនអាចអាន Transactions បាន។ សូមពិនិត្យ Firebase Rules/ការភ្ជាប់ Firebase។</div>';
      }
    );
}

function init() {
  if (!window.firebase || !window.firebaseConfig) {
    showLogin("❌ Firebase config មិនទាន់ load។");
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.firestore();

  $("loginForm").addEventListener("submit", loginEmailPassword);
  $("googleBtn").addEventListener("click", loginGoogle);
  $("refreshBtn").addEventListener("click", watchRequests);

  $("logoutBtn").addEventListener("click", async () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    await auth.signOut();
  });

  auth.onAuthStateChanged(user => {
    if (!user) {
      showLogin();
      return;
    }

    if (!isAdmin(user)) {
      auth.signOut();
      showLogin("❌ គណនីនេះមិនមែនជា Admin។");
      return;
    }

    showAdmin(user);
    watchRequests();
  });
}

init();
