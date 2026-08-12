KHMER GAME — TOP UP V1

Upload topup.js to the ROOT of GitHub.

Then in index.html, immediately before </body>, add:
<script src="topup.js?v=1"></script>

This version only creates a Firestore transaction with status=pending.
It never adds coins on the client and does not process real payment yet.
