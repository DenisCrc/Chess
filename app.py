import os
import sys
import threading
import time
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import chess

# Add the current directory to sys.path so we can import from chess_py
sys.path.append(os.path.join(os.getcwd(), 'chess_py'))

from state import GameState
from engine import StockfishEngine

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# ── Configuration ──────────────────────────────────────────────────────
STOCKFISH_PATH = r"C:\\Users\\mvcra\\Downloads\\stockfish-windows-x86-64-avx2\\stockfish\\stockfish.exe"

# ── Global State ──────────────────────────────────────────────────────
game = GameState()
engine = StockfishEngine(STOCKFISH_PATH)

# Start engine polling thread
def engine_poll_loop():
    while True:
        engine.poll()
        time.sleep(0.01)

threading.Thread(target=engine_poll_loop, daemon=True).start()

# ── Routes ────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('.', 'main.html')

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)

@app.route('/style.css')
def send_css():
    return send_from_directory('.', 'style.css')

@app.route('/api/state', methods=['GET'])
def get_state():
    return jsonify({
        'fen': game.board.fen(),
        'turn': 'white' if game.board.turn == chess.WHITE else 'black',
        'game_over': game.game_over,
        'last_move': game.last_move.uci() if game.last_move else None,
        'captured': {
            'white': [p.symbol() for p in game.captured[chess.WHITE]],
            'black': [p.symbol() for p in game.captured[chess.BLACK]],
        },
        'is_check': game.board.is_check(),
    })

@app.route('/api/move', methods=['POST'])
def make_move():
    data = request.json
    from_sq_str = data.get('from')
    to_sq_str = data.get('to')
    promotion = data.get('promotion') # e.g. 'q'

    try:
        from_sq = chess.parse_square(from_sq_str)
        to_sq = chess.parse_square(to_sq_str)
        
        # Check for promotion if not provided but needed
        move = chess.Move(from_sq, to_sq)
        if move not in game.board.legal_moves:
            # Maybe it's a promotion?
            promo_move = chess.Move(from_sq, to_sq, promotion=chess.QUEEN)
            if promo_move in game.board.legal_moves and not promotion:
                return jsonify({'status': 'promotion_required'})
            
            if promotion:
                pt = chess.Piece.from_symbol(promotion).piece_type
                move = chess.Move(from_sq, to_sq, promotion=pt)

        if move in game.board.legal_moves:
            game._apply(move)
            engine.analyze(game.board)
            return get_state()
        else:
            return jsonify({'error': 'Illegal move'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/analysis', methods=['GET'])
def get_analysis():
    lines = engine.get_san_lines(game.board)
    return jsonify({
        'depth': engine.depth,
        'status': engine.status,
        'lines': lines
    })

@app.route('/api/reset', methods=['POST'])
def reset_game():
    game.reset()
    engine.analyze(game.board)
    return get_state()

if __name__ == '__main__':
    # Initial analysis
    engine.analyze(game.board)
    app.run(host='0.0.0.0', port=5000, debug=False)
