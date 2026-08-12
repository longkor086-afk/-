KHMER GAME — LERAK V2

Files:
1. game.js
2. game-ui-fix.js

What changed:
- Rebuilt Lerak local gameplay core.
- Keeps both modes: រែកធម្មតា and រែកព័ទ្ធ.
- Keeps the existing opening rule: select 2 front pieces with one square between them.
- Wooden 3D-style pieces with clear white/black appearance.
- 3:00 + 2 seconds increment clock.
- 30-second Bot fallback.
- Legal move highlighting.
- Capture/រែក highlighting.
- Surround/group capture logic based on the existing project rules.
- Keeps optional ហៅរែក flow.
- Removes the old game-ui-fix timer/Bot/MutationObserver conflict.

Install:
Replace the existing main/game.js with game.js from this ZIP.
Replace main/game-ui-fix.js with game-ui-fix.js from this ZIP.
Then reload the GitHub Pages site and do a hard refresh.

Note:
This ZIP is a gameplay/local-play rebuild first. Online Firebase matchmaking, Coins, ranking and payment are intentionally not changed in this step.
