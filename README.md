<div align="center">

# ChessGame

**A beautifully crafted, fully interactive chess game with real-time multiplayer and professional engine analysis.**


[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-2.0+-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.0+-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

[Features](#features) · [What's New](#whats-new) · [Getting Started](#getting-started) · [How to Play](#how-to-play) · [Project Structure](#project-structure)

</div>

---

## What's New

- **Real-Time Multiplayer**: Play against friends using a robust room-based system powered by **Flask-SocketIO**. Simply create a room and share the 4-digit code.
- **Dual-Interface Architecture**: 
    - **Lobby/Play**: A dedicated interface for competitive play with time controls and color selection.
    - **Analysis Board**: A professional-grade analysis tool with move-by-move engine evaluation.
- **Server-Side Stockfish Integration**: Professional engine analysis now runs on the backend, providing deep evaluation lines and move suggestions without impacting browser performance.
- **Dynamic Time Controls**: Choose between Blitz (1m, 3m), Rapid (5m, 10m), or custom durations for multiplayer matches.

---

## Features

### Multiplayer & Social
- **Room System** — Create private rooms with unique alphanumeric codes.
- **Live Matchmaking** — Join rooms instantly; the game starts as soon as both players are connected.
- **Synchronized Timers** — Server-authoritative time tracking with visual "low time" warnings.
- **Color Selection** — Play as White, Black, or choose a random assignment.
- **Real-time Updates** — No page refreshes; moves, captures, and timer updates are pushed instantly via WebSockets.

### Professional Analysis
- **Stockfish 16+ Integration** — Access world-class engine evaluations directly in the Analysis view.
- **Top Move Suggestions** — View the top 5 engine-recommended moves with their corresponding centipawn evaluation.
- **Move History (SAN)** — Full move history tracking in Standard Algebraic Notation.
- **Interactive Evaluation** — Replay any move and see how the engine's perspective changes in real-time.

### Core Chess Engine
- **100% Rule Compliance** — Powered by `python-chess`, enforcing all rules including Castling, En Passant, and Pawn Promotion.
- **Checkmate & Stalemate Detection** — Automatic game termination with descriptive result modals.
- **Interactive Promotion** — Choose between Queen, Rook, Bishop, or Knight upon reaching the 8th rank.

### Premium UI/UX
- **Dark Luxury Theme** — A refined interface featuring glassmorphism, ambient glows, and high-contrast pieces.
- **Responsive Design** — Play seamlessly on desktop, tablet, or mobile browsers.
- **Drag & Drop** — Intuitive piece movement with ghost-image previews and valid move highlighting.
- **Board Flipping** — Rotate the perspective 180° at any time.

---

## Getting Started

### Prerequisites
- Python 3.8 or higher
- Stockfish Engine (Path configured in `app.py`)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ChessGame.git
   cd ChessGame
   ```

2. **Install dependencies**
   ```bash
   pip install flask flask-cors flask-socketio python-chess
   ```

3. **Configure Stockfish**
   Update the `STOCKFISH_PATH` in `app.py` to point to your local Stockfish executable.

### Running the Application

1. **Start the Flask server**
   ```bash
   python app.py
   ```
2. **Access the game**
   - **Lobby/Play**: `http://localhost:5000/play`
   - **Analysis**: `http://localhost:5000/analysis`
   - **Main Hub**: `http://localhost:5000/`

---

## Project Structure

```
ChessGame/
├── app.py              # Flask server + SocketIO event handlers
├── play.html           # Multiplayer/Lobby interface
├── analysis.html       # Engine analysis interface
├── main.html           # Landing page / Main hub
├── style.css           # Global design system and component styles
├── js/                 # Frontend Logic
│   ├── lobby.js        # Multiplayer & SocketIO client logic
│   ├── analysis_init.js # Analysis mode initialization
│   ├── board.js        # Core board rendering
│   └── state.js        # Client-side state management
└── chess_py/           # Backend Core
    ├── state.py        # Game state & rule enforcement
    └── engine.py       # Stockfish integration wrapper
```

---

## Tech Stack

| Technology | Purpose |
|---|---|
| **Python / Flask** | Backend API and room management |
| **Flask-SocketIO** | Real-time WebSocket communication |
| **Python-Chess** | Core chess logic and move validation |
| **Stockfish** | Professional engine evaluation |
| **Vanilla JS** | Dynamic frontend components (no heavy frameworks) |
| **CSS3** | Glassmorphism, animations, and responsive layout |

---

## Future Roadmap

- [ ] **User Accounts**: Persist game history and ELO ratings.
- [ ] **Global Lobby**: Public matchmaking for players without a room code.
- [ ] **PGN/FEN Import**: Load external games for analysis.
- [ ] **Custom Themes**: Selectable board colors and piece sets.

---

<div align="center">

**Built with focus and dedication**

Star this repository if you find it useful!

</div>
