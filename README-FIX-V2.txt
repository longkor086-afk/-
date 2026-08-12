KHMER GAME FIX V2

1. auth.js
- Restores Coins + Points/Rank + Messages buttons in the top header.
- Creates a Messages modal and loads messages-history.js.
- Reads the user's Coins directly from Firestore users/{uid} before allowing entry.
- Fixes the Online stake flow: enough Coins -> Enter Lerak; not enough -> shows missing amount.
- Adds a proper Lerak entry screen for ?game=lerak and loads the existing game.js.
- Adds a dark/gold Lerak board UI.

2. coins-betting.js
- Corrects payout display:
  1,000 -> 900
  10,000 -> 9,500
  100,000 -> 99,000
  1,000,000 -> 990,000
  10,000,000 -> 9,900,000

3. ouk/index.html + ouk/ouk.css
- Adds Back button.
- Makes the board much clearer and matches the Khmer Game dark/gold design.

IMPORTANT:
- This is still TEST/UI betting. It does not deduct or award real Coins.
- Upload/replace these files in the repository:
  auth.js
  coins-betting.js
  ouk/index.html
  ouk/ouk.css
- Keep the existing game.js, messages-history.js, Firebase config, rules, admin, and other files.
