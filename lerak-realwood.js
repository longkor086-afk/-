/* KHMER GAME — LERAK REAL WOOD V3
   Fix:
   - Works with the current game.js classes: .piece.white / .piece.black
   - Realistic carved wooden board
   - Light/dark wooden pieces
   - 3D depth, rim, highlights and shadows
   - Keeps legal-move/capture markers visible
   - Styles the 3:00 + 2s clock
*/
(() => {
  "use strict";

  const STYLE_ID = "lerak-realwood-v3-style";

  function install() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
/* ===== REAL WOOD BOARD ===== */
#board.lerak-board{
  --wood-dark:#4b2813;
  --wood-mid:#8a5729;
  --wood-light:#d7aa60;

  background:
    repeating-linear-gradient(
      8deg,
      #00000008 0 2px,
      #ffffff0b 3px 5px,
      transparent 6px 13px
    ),
    linear-gradient(135deg,#b77b3d,#70401e 48%,#9d6530);

  border:7px solid #69401e !important;
  border-radius:20px !important;
  padding:4px !important;

  box-shadow:
    0 0 0 2px #d5a652,
    inset 0 0 0 2px #32170a,
    inset 0 8px 18px #ffffff20,
    inset 0 -12px 20px #0009,
    0 18px 35px #000b !important;
}

/* board squares */
#board.lerak-board .cell{
  position:relative !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  overflow:hidden !important;
  border:1px solid #67401f !important;
}

#board.lerak-board .cell.light{
  background:
    repeating-linear-gradient(
      8deg,
      #6b3b1b08 0 2px,
      #ffffff12 3px 5px,
      transparent 6px 12px
    ),
    linear-gradient(135deg,#e1be79,#c48b48 55%,#a86d32) !important;
}

#board.lerak-board .cell.dark{
  background:
    repeating-linear-gradient(
      -8deg,
      #00000010 0 2px,
      #ffffff09 3px 5px,
      transparent 6px 12px
    ),
    linear-gradient(135deg,#9b642f,#74431e 55%,#5f3215) !important;
}

/* selected square */
#board.lerak-board .cell.selected{
  box-shadow:
    inset 0 0 0 4px #4da3ff,
    inset 0 0 25px #4da3ff55 !important;
}

/* ===== WOODEN PIECES ===== */
#board.lerak-board .piece{
  position:relative !important;
  width:74% !important;
  height:74% !important;
  min-width:0 !important;
  min-height:0 !important;

  border-radius:50% !important;
  border:3px solid #42220f !important;

  transform:perspective(280px) rotateX(7deg) !important;
  transition:
    transform .16s ease,
    filter .16s ease !important;

  z-index:3 !important;
  overflow:visible !important;

  box-shadow:
    inset 7px 7px 10px #ffffff35,
    inset -10px -12px 16px #0009,
    0 7px 8px #0009 !important;
}

/* wooden side/rim */
#board.lerak-board .piece::before{
  content:"";
  position:absolute;
  z-index:-2;

  left:-5%;
  top:8%;
  width:110%;
  height:92%;

  border-radius:50%;

  background:
    repeating-linear-gradient(
      8deg,
      #0000 0 6px,
      #00000018 7px 9px,
      #ffffff09 10px 13px
    ),
    linear-gradient(#815027,#49240f 72%,#281207);

  border:2px solid #2b1308;

  box-shadow:
    inset 0 7px 7px #ffffff18,
    inset 0 -10px 12px #000b,
    0 7px 5px #0008;

  transform:translateY(7%);
}

/* carved top face */
#board.lerak-board .piece::after{
  content:"";
  position:absolute;
  z-index:-1;
  inset:0;

  border-radius:50%;

  background:
    repeating-radial-gradient(
      ellipse at 38% 44%,
      #0000000c 0 2px,
      #ffffff0b 3px 5px,
      transparent 6px 10px
    ),
    repeating-linear-gradient(
      12deg,
      #ffffff08 0 2px,
      #0000000b 3px 5px,
      transparent 6px 11px
    ),
    radial-gradient(
      circle at 28% 20%,
      #ffffff55 0 7%,
      transparent 20%
    ),
    radial-gradient(
      circle at 50% 42%,
      #ffffff12 0 25%,
      transparent 58%
    ),
    #a96d32;

  border:2px solid #5a2f13;

  box-shadow:
    inset 8px 8px 12px #ffffff20,
    inset -10px -12px 16px #0009,
    0 2px 2px #fff3;
}

/* WHITE / LIGHT WOOD */
#board.lerak-board .piece.white{
  border-color:#7b4b20 !important;
  filter:saturate(.95);
}

#board.lerak-board .piece.white::after{
  background:
    repeating-radial-gradient(
      ellipse at 35% 42%,
      #6f3b190f 0 2px,
      #ffffff18 3px 5px,
      transparent 6px 11px
    ),
    repeating-linear-gradient(
      9deg,
      #6f3b1910 0 2px,
      #ffffff18 3px 5px,
      transparent 6px 12px
    ),
    radial-gradient(
      circle at 28% 19%,
      #ffffffaa 0 6%,
      transparent 21%
    ),
    linear-gradient(
      145deg,
      #fff0c4 0%,
      #e7c17c 43%,
      #b87532 100%
    );

  border-color:#7a4a21;
}

/* BLACK / DARK WOOD */
#board.lerak-board .piece.black{
  border-color:#301509 !important;
}

#board.lerak-board .piece.black::after{
  background:
    repeating-radial-gradient(
      ellipse at 37% 44%,
      #00000018 0 2px,
      #ffffff0b 3px 5px,
      transparent 6px 11px
    ),
    repeating-linear-gradient(
      -8deg,
      #00000018 0 2px,
      #ffffff09 3px 5px,
      transparent 6px 12px
    ),
    radial-gradient(
      circle at 28% 18%,
      #ffffff35 0 5%,
      transparent 18%
    ),
    linear-gradient(
      145deg,
      #8a5528 0%,
      #4b2814 42%,
      #1b0c05 100%
    );

  border-color:#281208;
}

/* KING */
#board.lerak-board .piece.king{
  outline:2px solid #d7ad58;
  outline-offset:2px;

  box-shadow:
    inset 7px 7px 10px #ffffff35,
    inset -10px -12px 16px #0009,
    0 8px 12px #000b,
    0 0 0 3px #c79b4d66 !important;
}

/* lifted selected piece */
#board.lerak-board .cell.selected .piece{
  transform:
    perspective(280px)
    rotateX(7deg)
    translateY(-5px)
    scale(1.06) !important;

  filter:
    brightness(1.12)
    drop-shadow(0 9px 5px #000b);
}

/* legal move marker */
#board.lerak-board .cell.move-choice::after,
#board.lerak-board .cell.opening-choice::after{
  content:"";
  position:absolute;
  width:20%;
  height:20%;
  border-radius:50%;

  background:#f4d27b !important;
  box-shadow:
    0 0 0 3px #3d2513aa,
    0 0 12px #ffe39a99;

  z-index:6;
}

/* capture marker */
#board.lerak-board .cell.capture-choice::after{
  content:"";
  position:absolute;
  inset:7%;

  border:4px solid #e6b85d !important;
  border-radius:50%;

  background:transparent !important;
  box-shadow:
    inset 0 0 12px #0008,
    0 0 8px #e6b85d66;

  z-index:6;
}

/* ===== CLOCK ===== */
#lerakClock,
.lerak-clock-v2{
  margin:10px 0 !important;
}

.lerak-clock-v2 .clock{
  background:
    linear-gradient(145deg,#2a1b0f,#111114 65%) !important;

  border:1px solid #765127 !important;

  box-shadow:
    inset 0 1px 0 #fff1,
    0 8px 18px #0007 !important;
}

.lerak-clock-v2 .clock.active{
  border-color:#e5b95c !important;

  box-shadow:
    0 0 0 2px #e5b95c22,
    inset 0 1px 0 #fff2,
    0 8px 20px #0009 !important;
}

@media(max-width:430px){
  #board.lerak-board{
    border-width:5px !important;
    border-radius:15px !important;
  }

  #board.lerak-board .piece{
    width:70% !important;
    height:70% !important;
    border-width:2px !important;
  }
}
`;
    document.head.appendChild(style);
  }

  function start() {
    install();

    const board = document.getElementById("board");

    if (board && !board.dataset.lerakRealwoodObserver) {
      board.dataset.lerakRealwoodObserver = "1";

      new MutationObserver(() => {
        install();
      }).observe(board, {
        childList: true,
        subtree: true
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }
})();
