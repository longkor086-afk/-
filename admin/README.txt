KHMER GAME — admin.js V2 FIXED

Replace:
admin/admin.js

This version:
- Uses Admin email: longkor168@gmail.com
- Removes the old YOUR_ADMIN_EMAIL blocking check
- Keeps Admin-only email verification
- Keeps pending Top Up approve/reject logic
- Does not expose a password or payment secret

IMPORTANT:
The Firestore Rules must also use the same Admin email and must be Published in Firebase Console.
