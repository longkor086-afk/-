/* KHMER GAME — LERAK REAL WOOD V4
   Adds the king emblem without changing game rules.
*/
(() => {
  "use strict";

  const MARK_CLASS = "lerak-king-mark";

  function markKings() {
    const board = document.getElementById("board");
    if (!board) return;

    board.querySelectorAll(".piece.king").forEach(piece => {
      if (piece.querySelector("." + MARK_CLASS)) return;

      const mark = document.createElement("span");
      mark.className = MARK_CLASS;

      mark.textContent = piece.classList.contains("white") ? "♔" : "♚";
      mark.setAttribute(
        "aria-label",
        piece.classList.contains("white") ? "ស្តេចស" : "ស្តេចខ្មៅ"
      );

      piece.appendChild(mark);
    });
  }

  function start() {
    markKings();

    const board = document.getElementById("board");
    if (!board || board.dataset.lerakVisualObserver === "1") return;

    board.dataset.lerakVisualObserver = "1";

    new MutationObserver(markKings).observe(board, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once:true });
  } else {
    start();
  }
})();
