/* KHMER GAME — Admin Top Up Panel V1
   Change ONLY ADMIN_EMAIL to the email used by your admin Firebase account.
*/
const ADMIN_EMAIL = "longkor168@gmail.com";

let auth, db, unsubscribe;

function money(n){ return "$" + Number(n || 0).toFixed(2); }
function coins(n){ return Number(n || 0).toLocaleString(); }
function esc(v){
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function showLogin(msg){
  document.getElementById("loginState").classList.remove("hidden");
  document.getElementById("adminState").classList.add("hidden");
  document.getElementById("loginMsg").textContent = msg;
}

function showAdmin(user){
  document.getElementById("loginState").classList.add("hidden");
  document.getElementById("adminState").classList.remove("hidden");
  document.getElementById("adminEmail").textContent = user.email || "-";
}

async function approve(id){
  if(!confirm("Approve ហើយបន្ថែម Coins មែនទេ?")) return;
  try{
    await db.runTransaction(async tx => {
      const trRef = db.collection("transactions").doc(id);
      const trSnap = await tx.get(trRef);
      if(!trSnap.exists) throw new Error("Transaction មិនមានទៀតទេ។");
      const t = trSnap.data();
      if(t.status !== "pending") throw new Error("Transaction នេះត្រូវបានដំណើរការរួចហើយ។");

      const userRef = db.collection("users").doc(t.userId);
      const userSnap = await tx.get(userRef);
      if(!userSnap.exists) throw new Error("User Profile មិនមានទេ។");

      const u = userSnap.data();
      tx.update(userRef, {
        coins: Number(u.coins || 0) + Number(t.coins || 0)
      });
      tx.update(trRef, {
        status: "approved",
        processedAt: firebase.firestore.FieldValue.serverTimestamp(),
        processedBy: auth.currentUser.uid
      });
    });
    alert("✅ Approve ជោគជ័យ — Coins បានបន្ថែម។");
  }catch(e){
    console.error(e);
    alert("❌ " + (e.message || "មិនអាច Approve បាន"));
  }
}

async function reject(id){
  if(!confirm("Reject Top Up Request នេះមែនទេ?")) return;
  try{
    await db.collection("transactions").doc(id).update({
      status:"rejected",
      processedAt:firebase.firestore.FieldValue.serverTimestamp(),
      processedBy:auth.currentUser.uid
    });
    alert("✅ Reject ជោគជ័យ។");
  }catch(e){
    console.error(e);
    alert("❌ " + (e.message || "មិនអាច Reject បាន"));
  }
}

function render(docs){
  const box = document.getElementById("requests");
  document.getElementById("pendingCount").textContent = docs.length;
  if(!docs.length){
    box.innerHTML = '<div class="empty">🎉 មិនមាន Pending Top Up ទេ</div>';
    return;
  }
  box.innerHTML = docs.map(s => {
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
        <button class="gold" onclick="approve('${s.id}')">✅ Approve</button>
        <button class="danger" onclick="reject('${s.id}')">❌ Reject</button>
      </div>
    </article>`;
  }).join("");
}

function watchRequests(){
  if(unsubscribe) unsubscribe();
  unsubscribe = db.collection("transactions")
    .where("type","==","topup")
    .where("status","==","pending")
    .onSnapshot(
      snap => render(snap.docs),
      err => {
        console.error(err);
        document.getElementById("requests").innerHTML =
          '<div class="empty">❌ មិនអាចអាន Transactions បាន។ សូម Publish Rules Admin ជាមុន។</div>';
      }
    );
}

async function init(){
  if(!window.firebase || !window.firebaseConfig){
    showLogin("Firebase មិនទាន់ load។");
    return;
  }
  if(!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();

  auth.onAuthStateChanged(user => {
    if(!user){
      showLogin("សូម Login ជាមួយ Admin account មុន។");
      return;
    }
    if(ADMIN_EMAIL === "longkor168@gmail.com"){
      showLogin("ត្រូវកំណត់ ADMIN_EMAIL ក្នុង admin.js ជាមុន។");
      return;
    }
    if((user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()){
      showLogin("❌ គណនីនេះមិនមែនជា Admin។");
      return;
    }
    showAdmin(user);
    watchRequests();
  });

  document.getElementById("refreshBtn").onclick = watchRequests;
  document.getElementById("logoutBtn").onclick = () => auth.signOut();
}
init();
