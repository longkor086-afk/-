KHMER GAME — ADMIN

1. Put these files inside:
   admin/

2. Required files:
   admin.html
   admin.js
   admin.css

3. Open:
   https://longkor086-afk.github.io/-/admin/admin.html

4. Admin email configured:
   longkor168@gmail.com

5. Email/password login requires that this email already exists in
   Firebase Authentication.

6. Google Login requires Google provider to be enabled in:
   Firebase Console > Authentication > Sign-in method.

IMPORTANT:
The Admin email check in JavaScript is only a UI restriction.
For production security, Firestore Rules must also restrict admin writes
using a proper admin role/custom claim or another server-side authorization.
