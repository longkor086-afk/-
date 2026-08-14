/* KHMER GAME — LERAK REAL WOOD V5
   Visual override only.
   Waits until game.js has rendered the board, then injects V5 CSS
   AFTER the old game.js style so the old style cannot override it.
*/
(() => {
  "use strict";

  const STYLE_ID = "lerak-realwood-v5-style";
  const KING_CLASS = "lerak-king-mark";

  const V5_CSS_URL = "lerak-realwood.css?v=5";

  function loadCssLast() {
    if (document.getElementById(STYLE_ID)) return;

    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = V5_CSS_URL + "&t=" + Date.now();
    document.head.appendChild(link);
  }

  function markKings() {
    const board = document.getElementById("board");
    if (!board) return;

    board.querySelectorAll(".piece.king").forEach(piece => {
      if (piece.querySelector("." + KING_CLASS)) return;

      const mark = document.createElement("span");
      mark.className = KING_CLASS;
      mark.textContent = piece.classList.contains("white") ? "♔" : "♚";
      mark.setAttribute(
        "aria-label",
        piece.classList.contains("white") ? "ស្តេចស" : "ស្តេចខ្មៅ"
      );
      piece.appendChild(mark);
    });
  }

  function start() {
    loadCssLast();
    markKings();

    const board = document.getElementById("board");
    if (!board || board.dataset.lerakV5Observer === "1") return;

    board.dataset.lerakV5Observer = "1";

    new MutationObserver(() => {
      loadCssLast();
      markKings();
    }).observe(board, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  /* game.js can render/re-render after this file starts. */
  setTimeout(start, 250);
  setTimeout(start, 800);
  setTimeout(start, 1600);
})();
