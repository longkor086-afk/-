/* KHMER GAME — Transaction History */
let historyUnsubscribe = null;

function historyMoney(n){
  return "$" + Number(n || 0).toFixed(2);
}

function historyCoins(n){
  return Number(n || 0).toLocaleString();
}

function historyDate(ts){
  if(!ts) return "-";
  try{
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("km-KH", {
      year:"numeric", month:"2-digit", day:"2-digit",
      hour:"2-digit", minute:"2-digit"
    });
  }catch(e){ return "-"; }
}

function historyStatus(status){
  if(status === "approved") return '<span class="tx-status approved">✅ បានបញ្ចូល</span>';
  if(status === "rejected") return '<span class="tx-status rejected">❌ បដិសេធ</span>';
  return '<span class="tx-status pending">⏳ កំពុងរង់ចាំ</span>';
}

function renderTransactionHistory(docs){
  const box = document.getElementById("transactionHistory");
  if(!box) return;

  if(!docs.length){
    box.innerHTML = '<div class="tx-empty">មិនទាន់មានប្រវត្តិ Top Up ទេ</div>';
    return;
  }

  box.innerHTML = docs.map(doc => {
    const d = doc.data();
    return `
      <article class="tx-item">
        <div class="tx-top">
          <div>
            <b>🪙 ${historyCoins(d.coins)} Coins</b>
            <small>${d.packageId || "Top Up"}</small>
          </div>
          <strong>${historyMoney(d.amount)}</strong>
        </div>

        <div class="tx-info">
          ${historyStatus(d.status)}
          <span>🕐 ${historyDate(d.createdAt)}</span>
        </div>

        <div class="tx-id">ID: ${doc.id}</div>
      </article>
    `;
  }).join("");
}

function loadTransactionHistory(user){
  const box = document.getElementById("transactionHistory");
  if(!box || !user) return;

  if(historyUnsubscribe) historyUnsubscribe();

  historyUnsubscribe = firebase.firestore()
    .collection("transactions")
    .where("userId","==",user.uid)
    .onSnapshot(
      snap => {
        const docs = snap.docs
          .filter(d => d.data().type === "topup")
          .sort((a,b) => {
            const av = a.data().createdAt?.toMillis?.() || 0;
            const bv = b.data().createdAt?.toMillis?.() || 0;
            return bv - av;
          });
        renderTransactionHistory(docs);
      },
      err => {
        console.error(err);
        box.innerHTML =
          '<div class="tx-empty error">❌ មិនអាចអានប្រវត្តិបាន។ សូម Refresh។</div>';
      }
    );
}

function initTransactionHistory(){
  if(!window.firebase || !window.firebaseConfig) return;

  if(!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);

  firebase.auth().onAuthStateChanged(user => {
    if(user) loadTransactionHistory(user);
    else{
      const box = document.getElementById("transactionHistory");
      if(box) box.innerHTML =
        '<div class="tx-empty">🔐 សូមចូលគណនី ដើម្បីមើលប្រវត្តិ Top Up។</div>';
    }
  });
}

initTransactionHistory();
