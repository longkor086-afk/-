/* KHMER GAME — compatibility shim
 * Gameplay, timer, Bot fallback and visual styles are now handled by game.js.
 * This file intentionally does not attach another MutationObserver or game loop.
 */
(function(){
  window.khmerGameUiV2 = true;
})();
