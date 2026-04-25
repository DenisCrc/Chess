<div align="center">

# ♚ ChessGame

**A beautifully crafted, fully interactive chess game built with vanilla HTML, CSS & JavaScript.**

![Chess Game Screenshot](screenshot.png)

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Features](#-features) · [Getting Started](#-getting-started) · [How to Play](#-how-to-play) · [Project Structure](#-project-structure) · [Contributing](#-contributing)

</div>

---

## ✨ Features

### Complete Chess Rules
- **Full piece movement** — all six piece types with correct move logic
- **Castling** — both kingside and queenside, with all standard conditions enforced
- **En Passant** — correctly implemented per FIDE rules
- **Pawn Promotion** — interactive modal to choose Queen, Rook, Bishop, or Knight
- **Check Detection** — real-time check highlighting with visual indicator on the king
- **Checkmate & Stalemate** — automatic detection with result modal

### Polished UI/UX
- 🎨 **Dark luxury theme** — refined dark UI with glassmorphism and ambient glow effects
- ♟️ **Chess.com-inspired board** — classic green & cream color palette
- 🏷️ **Rank & file labels** — algebraic notation displayed around the board
- 🔄 **Board flipping** — rotate the board 180° to play from either perspective
- 📊 **Captured pieces tracker** — displays captured pieces for both players, sorted by value
- 💡 **Move indicators** — valid move dots and capture rings shown on piece selection
- ✅ **Last move highlight** — previous move squares are highlighted for context
- ⚡ **Smooth animations** — piece hover effects, modal transitions, and ambient pulse
- 📱 **Fully responsive** — adapts beautifully to any screen size

---

## 🚀 Getting Started

### Prerequisites
All you need is a modern web browser — no build tools, frameworks, or dependencies required.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ChessGame.git
   cd ChessGame
   ```

2. **Open in browser**
   ```bash
   # Simply open main.html in your browser
   start main.html        # Windows
   open main.html         # macOS
   xdg-open main.html     # Linux
   ```

   Or right-click `main.html` → **Open with** → your preferred browser.

> [!TIP]
> No server required! The game runs entirely client-side as a static HTML file.

---

## 🎮 How to Play

| Action | How |
|---|---|
| **Select a piece** | Click on any piece of the current player's color |
| **See valid moves** | Dots appear on valid squares; rings appear on capturable pieces |
| **Move a piece** | Click a highlighted square to move |
| **Deselect** | Click the selected piece again, or click an empty invalid square |
| **Promote a pawn** | Move a pawn to the last rank — a modal lets you choose the new piece |
| **Flip the board** | Click the **Rotește Tabla** button |
| **New game** | Click the **Joc Nou** button |

> [!NOTE]
> The game enforces all legal move rules, including preventing moves that would leave your own king in check.

---

## 📁 Project Structure

```
ChessGame/
├── main.html       # Page structure, modals, and layout
├── style.css       # Design tokens, board styling, animations, responsive rules
├── script.js       # Game state, piece logic, UI updates, event handling
├── screenshot.png  # Preview image
└── README.md       # This file
```

### Architecture Overview

| File | Responsibility |
|---|---|
| **main.html** | Semantic HTML5 structure — header, chessboard grid, player bars, turn indicator, promotion & result modals |
| **style.css** | CSS custom properties design system, chess.com-inspired board palette, dark UI theme, glassmorphism effects, animations, responsive breakpoints |
| **script.js** | 8×8 array game state, full piece movement validation, check/checkmate/stalemate detection, castling rights tracking, en passant logic, pawn promotion flow, board flipping, captured pieces tracking |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic page structure |
| **CSS3** | Custom properties, Grid layout, animations, backdrop-filter, gradients |
| **Vanilla JavaScript** | Game logic, DOM manipulation, event handling |
| **Google Fonts** | [Inter](https://fonts.google.com/specimen/Inter) (UI) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) (labels) |
| **Unicode Chess Symbols** | ♔♕♖♗♘♙ — no external image assets needed |

**Zero dependencies.** No frameworks. No build step. Just clean, readable code.

---

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

- [ ] Add move history / notation panel (PGN)
- [ ] Implement undo/redo functionality
- [ ] Add a chess clock / timer
- [ ] Sound effects for moves, captures, and check
- [ ] AI opponent (minimax with alpha-beta pruning)
- [ ] Drag-and-drop piece movement
- [ ] FEN import/export
- [ ] Multiplayer over WebSocket

### Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ♟️ and ❤️**

⭐ Star this repo if you found it useful!

</div>
