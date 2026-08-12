KHMER GAME — ADMIN TOP UP V1

Files:
- admin.html
- admin.css
- admin.js
- firestore-rules-admin.txt

1) Upload the 3 admin files to the ROOT of GitHub.
2) Open admin.js and replace:
   YOUR_ADMIN_EMAIL
   with the exact email used by your Firebase Admin account.
3) In Firebase Firestore > Rules, use firestore-rules-admin.txt.
   Replace YOUR_ADMIN_EMAIL there with the same email.
4) Publish Rules.
5) Open:
   https://longkor086-afk.github.io/-/admin.html

Security:
- Normal users cannot approve/reject transactions.
- Normal users cannot change their own Coins.
- Approve uses a Firestore transaction to update User Coins + Transaction status together.
- A transaction that is no longer pending cannot be approved twice.

NOTE:
This Admin Panel does NOT prove a real payment yet. Payment verification must be connected before production use.


V2 FIX:
- admin.html now loads ../firebase-config.js
- admin.js no longer blocks the configured admin email
- Firestore rules use the configured admin email
