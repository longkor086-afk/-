/* KHMER GAME — Messages + Transaction History */
(function () {
  let unsubscribe = null;

  const $ = id => document.getElementById(id);

  function money(n) {
    return "$" + Number(n || 0).toFixed(2);
  }

  function coins(n) {
    return Number(n || 0).toLocaleString();
  }

  function dateText(ts) {
    if (!ts) return "-";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString("km-KH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "-";
    }
  }

  function statusText(status) {
    if (status === "approved")
      return '<span class="mh-status approved">✅ បានបញ្ចូល</span>';
    if (status === "rejected")
      return '<span class="mh-status rejected">❌ បដិសេធ</span>';
    return '<span class="mh-status pending">⏳ កំពុងរង់ចាំ</span>';
  }

  function render(docs) {
    const box = $("messagesHistory");
    const badge = $("messagesBadge");

    if (!box) return;

    if (badge) {
      const pending = docs.filter(d => d.data().status === "pending").length;
      badge.textContent = pending > 0 ? pending : "";
      badge.style.display = pending > 0 ? "inline-flex" : "none";
    }

    if (!docs.length) {
      box.innerHTML = `
        <div class="mh-empty">
          <div class="mh-empty-icon">📭</div>
          <b>មិនទាន់មានសារ</b>
          <small>ប្រវត្តិ Top Up របស់អ្នកនឹងបង្ហាញនៅទីនេះ</small>
        </div>`;
      return;
    }

    box.innerHTML = docs.map(doc => {
      const d = doc.data();

      return `
        <article class="mh-item ${d.status || "pending"}">
          <div class="mh-icon">🪙</div>

          <div class="mh-content">
            <div class="mh-head">
              <b>Top Up ${coins(d.coins)} Coins</b>
              <strong>${money(d.amount)}</strong>
            </div>

            <div class="mh-meta">
              ${statusText(d.status)}
              <span>🕐 ${dateText(d.createdAt)}</span>
            </div>

            <small class="mh-package">
              ${d.packageId || "Top Up"} · ID: ${doc.id}
            </small>
          </div>
        </article>`;
    }).join("");
  }

  function load(user) {
    const box = $("messagesHistory");
    if (!box || !user) return;

    if (unsubscribe) unsubscribe();

    unsubscribe = firebase.firestore()
      .collection("transactions")
      .where("userId", "==", user.uid)
      .onSnapshot(
        snap => {
          const docs = snap.docs
            .filter(doc => doc.data().type === "topup")
            .sort((a, b) => {
              const av = a.data().createdAt?.toMillis?.() || 0;
              const bv = b.data().createdAt?.toMillis?.() || 0;
              return bv - av;
            });

          render(docs);
        },
        err => {
          console.error("Messages history:", err);
          box.innerHTML = `
            <div class="mh-empty mh-error">
              ❌ មិនអាចអានសារបាន។ សូម Refresh។
            </div>`;
        }
      );
  }

  function init() {
    if (!window.firebase || !window.firebaseConfig) return;

    if (!firebase.apps.length) {
      firebase.initializeApp(window.firebaseConfig);
    }

    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        load(user);
      } else {
        const box = $("messagesHistory");
        if (box) {
          box.innerHTML = `
            <div class="mh-empty">
              <div class="mh-empty-icon">🔐</div>
              <b>សូមចូលគណនី</b>
              <small>Login ដើម្បីមើលប្រវត្តិ Top Up</small>
            </div>`;
        }
      }
    });
  }

  window.openMessagesHistory = function () {
    const modal = $("messagesModal");
    if (modal) {
      modal.classList.add("show");
      document.body.classList.add("messages-open");
    }
  };

  window.closeMessagesHistory = function () {
    const modal = $("messagesModal");
    if (modal) {
      modal.classList.remove("show");
      document.body.classList.remove("messages-open");
    }
  };

  document.addEventListener("click", e => {
    const modal = $("messagesModal");
    if (modal && e.target === modal) {
      window.closeMessagesHistory();
    }
  });

  init();
})();
