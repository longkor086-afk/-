KHMER GAME — TRANSACTION HISTORY

This ZIP adds User Transaction History without changing the existing
Top Up/Admin files.

Files:
- transaction-history.js
- transaction-history.css
- README.txt

Install:
1. Upload transaction-history.js and transaction-history.css to the ROOT
   of your GitHub repository.
2. In the page where you want the history, add:
   <link rel="stylesheet" href="transaction-history.css?v=1">
   before </head>
3. Add this where you want the history card:
   <section class="history-card">
     <h2>🧾 ប្រវត្តិ Top Up</h2>
     <p class="history-sub">ប្រវត្តិការទិញ Coins របស់អ្នក</p>
     <div id="transactionHistory" class="tx-list"></div>
   </section>
4. Add transaction-history.js AFTER firebase-config.js and Firebase
   Auth/Firestore scripts.

The script reads only the signed-in user's transactions.
It displays pending, approved and rejected statuses.
No Firestore Rules change is required because the existing rules already
allow a user to read their own transactions.
