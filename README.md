<div align="center">

# ChessGame

**A beautifully crafted, fully interactive chess game with both web and desktop versions.**

![Chess Game Screenshot](screenshot.png)

[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

[Features](#features) · [What's New](#whats-new) · [Getting Started](#getting-started) · [How to Play](#how-to-play) · [Project Structure](#project-structure) · [Contributing](#contributing)

</div>

---

## What's New

- **Python Backend Migration**: The game logic and state management have been migrated to a Python Flask backend, ensuring robust rule enforcement via the python-chess library.
- **Desktop Version**: A standalone desktop application built with Pygame is now included, offering a native experience with the same high-end aesthetics.
- **Server-Side Engine Analysis**: Stockfish integration now runs on the server, providing faster and deeper analysis without taxing the user's browser.
- **API-Driven Architecture**: The web frontend now communicates with a RESTful API for all game actions, analysis requests, and state synchronization.

---

## Features

### Complete Chess Rules
- **Full piece movement** — all six piece types with correct move logic
- **Castling** — both kingside and queenside, with all standard conditions enforced
- **En Passant** — correctly implemented per FIDE rules
- **Pawn Promotion** — interactive selection for Queen, Rook, Bishop, or Knight
- **Check Detection** — real-time check highlighting with visual indicators
- **Checkmate & Stalemate** — automatic detection with detailed result reporting
- **Stockfish Engine Analysis** — real-time evaluation and top 5 best move suggestions
- **Drag and Drop** — move pieces intuitively by dragging or using the classic click-to-move method

### Polished UI/UX
- **Dark luxury theme** — refined dark UI with glassmorphism and ambient glow effects
- **Chess.com-inspired board** — classic green and cream color palette
- **Rank and file labels** — algebraic notation displayed clearly around the board
- **Board flipping** — rotate the board 180 degrees to play from either perspective
- **Captured pieces tracker** — displays captured pieces for both players, sorted by value
- **Move indicators** — valid move dots and capture rings shown on piece selection
- **Last move highlight** — previous move squares are highlighted for context
- **Smooth animations** — piece hover effects, modal transitions, and ambient pulse
- **Fully responsive** — adapts seamlessly to any screen size (Web version)

---

## Getting Started

### Prerequisites
- Python 3.8 or higher
- A modern web browser (for the Web version)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ChessGame.git
   cd ChessGame
   ```

2. **Install dependencies**
   ```bash
   pip install -r chess_py/requirements.txt
   ```

### Running the Game

#### Web Version (Flask + JS)
1. Start the backend server:
   ```bash
   python app.py
   ```
2. Open your browser and navigate to `http://localhost:5000`.

#### Desktop Version (Pygame)
1. Run the main script:
   ```bash
   python chess_py/main.py
   ```

---

## How to Play

| Action | How |
|---|---|
| **Select a piece** | Click on any piece or start dragging |
| **See valid moves** | Dots appear on valid squares; rings appear on capturable pieces |
| **Move a piece** | Drag the piece to the target square or click the destination |
| **Deselect** | Click the selected piece again, or click an empty invalid square |
| **Promote a pawn** | Move a pawn to the last rank — a selection menu will appear |
| **Flip the board** | Click the "Rotește Tabla" button or press "F" |
| **New game** | Click the "Joc Nou" button or press "F5" |

> [!NOTE]
> The game enforces all legal move rules, including preventing moves that would leave your own king in check.

---

## Project Structure

```
ChessGame/
├── app.py              # Flask server and Web API
├── main.html           # Web frontend structure
├── style.css           # Design tokens and styling
├── js/                 # Web logic (State, Board, Engine, Input)
├── chess_py/           # Core Python logic and Desktop version
│   ├── main.py         # Pygame entry point
│   ├── state.py        # Game state management
│   ├── engine.py       # Stockfish integration wrapper
│   ├── renderer.py     # Pygame rendering engine
│   └── requirements.txt # Python dependencies
├── screenshot.png      # Preview image
└── README.md           # Documentation
```

### Architecture Overview

| Component | Responsibility |
|---|---|
| **Flask API** | Handles move validation, state persistence, and communication with Stockfish. |
| **Web Frontend** | Provides a modern, responsive interface using Vanilla JS and CSS Grid. |
| **Pygame Desktop** | Offers a native desktop experience with identical logic and design. |
| **Python-Chess** | Core rule engine ensuring 100% compliance with official chess rules. |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Python** | Backend API, desktop application, and core game logic |
| **Flask** | Web server and RESTful API management |
| **Pygame** | Desktop rendering and input handling |
| **HTML5 & CSS3** | Semantic structure and advanced UI styling |
| **Vanilla JavaScript** | Frontend interactivity and API communication |
| **Stockfish** | Professional-grade chess engine for analysis |
| **Python-Chess** | Comprehensive chess rule implementation |

---

## Contributing

Contributions are welcome! If you have suggestions for improvements or new features, please open an issue or submit a pull request.

### Ideas for Future Development
- [ ] Implement undo/redo functionality
- [ ] Add a chess clock / timer
- [ ] Sound effects for moves, captures, and check
- [ ] FEN and PGN import/export
- [ ] Multiplayer support over WebSockets

---

<div align="center">

**Built with focus and dedication**

Star this repository if you find it useful!

</div>
