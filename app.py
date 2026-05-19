import os
import sys
import string
import random
import threading
import time
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import chess

# Add the current directory to sys.path so we can import from chess_py
sys.path.append(os.path.join(os.getcwd(), 'chess_py'))

from state import GameState
from engine import StockfishEngine
from analysis_tree import AnalysisTree, PromotionRequired

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# ── Configuration ──────────────────────────────────────────────────────
STOCKFISH_PATH = r"C:\\Users\\mvcra\\Downloads\\stockfish-windows-x86-64-avx2\\stockfish\\stockfish.exe"

# ── Global State ──────────────────────────────────────────────────────
# Analysis mode — branching move tree
analysis_tree = AnalysisTree()
engine = StockfishEngine(STOCKFISH_PATH)

# Play mode — room-based multiplayer
rooms = {}  # room_id -> room dict

# Start engine polling thread
def engine_poll_loop():
    while True:
        engine.poll()
        time.sleep(0.01)

threading.Thread(target=engine_poll_loop, daemon=True).start()

# Timer thread for play rooms
def room_timer_loop():
    while True:
        time.sleep(1)
        for room_id, room in list(rooms.items()):
            if not room.get('timer_active') or room.get('game_over'):
                continue
            turn = 'white' if room['game'].board.turn == chess.WHITE else 'black'
            if turn == 'white':
                room['white_time'] -= 1
                if room['white_time'] <= 0:
                    room['white_time'] = 0
                    room['game_over'] = 'timeout'
                    room['timer_active'] = False
                    socketio.emit('game_over', {
                        'reason': 'timeout',
                        'winner': 'black',
                        'title': 'Timp Expirat!',
                        'subtitle': 'Negrul câștigă prin timp.',
                        'icon': '⏰'
                    }, room=room_id)
            else:
                room['black_time'] -= 1
                if room['black_time'] <= 0:
                    room['black_time'] = 0
                    room['game_over'] = 'timeout'
                    room['timer_active'] = False
                    socketio.emit('game_over', {
                        'reason': 'timeout',
                        'winner': 'white',
                        'title': 'Timp Expirat!',
                        'subtitle': 'Albul câștigă prin timp.',
                        'icon': '⏰'
                    }, room=room_id)
            # Broadcast timer update
            socketio.emit('timer_update', {
                'white_time': room['white_time'],
                'black_time': room['black_time'],
            }, room=room_id)

threading.Thread(target=room_timer_loop, daemon=True).start()


def generate_room_code():
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=4))
        if code not in rooms:
            return code


def build_move_history(board):
    """Build SAN move history from a board's move stack."""
    history = []
    temp = chess.Board()
    for move in board.move_stack:
        history.append(temp.san(move))
        temp.push(move)
    return history


def build_room_state(room):
    """Build serializable state for a room."""
    game = room['game']
    board = game.board
    return {
        'fen': board.fen(),
        'turn': 'white' if board.turn == chess.WHITE else 'black',
        'game_over': room.get('game_over'),
        'last_move': game.last_move.uci() if game.last_move else None,
        'captured': {
            'white': [p.symbol() for p in game.captured[chess.WHITE]],
            'black': [p.symbol() for p in game.captured[chess.BLACK]],
        },
        'is_check': board.is_check(),
        'move_history': build_move_history(board),
        'white_time': room['white_time'],
        'black_time': room['black_time'],
    }


# ══════════════════════════════════════════════════════════════════════
# STATIC ROUTES
# ══════════════════════════════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory('.', 'main.html')

@app.route('/analysis')
def analysis_page():
    return send_from_directory('.', 'analysis.html')

@app.route('/play')
def play_page():
    return send_from_directory('.', 'play.html')

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)

@app.route('/style.css')
def send_css():
    return send_from_directory('.', 'style.css')


# ══════════════════════════════════════════════════════════════════════
# ANALYSIS REST API — Branching tree
# ══════════════════════════════════════════════════════════════════════

@app.route('/api/tree', methods=['GET'])
def get_tree():
    """Return the full analysis tree + current node state."""
    return jsonify(analysis_tree.serialize())


@app.route('/api/tree/move', methods=['POST'])
def tree_move():
    """Make a move from a specific node. Creates a branch if needed."""
    data = request.json
    from_sq  = data.get('from')
    to_sq    = data.get('to')
    promotion = data.get('promotion')
    node_id  = data.get('node_id')  # which node to move from

    try:
        node, is_new = analysis_tree.make_move(from_sq, to_sq, promotion, from_node_id=node_id)
        # Re-analyze from current position
        board = chess.Board(node.fen)
        engine.analyze(board)
        return jsonify(analysis_tree.serialize())
    except PromotionRequired:
        return jsonify({'status': 'promotion_required'})
    except (KeyError, ValueError) as e:
        return jsonify({'error': str(e)}), 400


@app.route('/api/tree/navigate', methods=['POST'])
def tree_navigate():
    """Navigate to a specific node by ID."""
    data = request.json
    node_id = data.get('node_id')
    try:
        node = analysis_tree.navigate_to(node_id)
        board = chess.Board(node.fen)
        engine.analyze(board)
        return jsonify(analysis_tree.serialize())
    except KeyError as e:
        return jsonify({'error': str(e)}), 404


@app.route('/api/tree/reset', methods=['POST'])
def tree_reset():
    """Reset the entire analysis tree."""
    analysis_tree.reset()
    board = chess.Board(analysis_tree.current().fen)
    engine.analyze(board)
    return jsonify(analysis_tree.serialize())


@app.route('/api/analysis', methods=['GET'])
def get_analysis():
    """Get current engine analysis lines (for the current node's position)."""
    current_node = analysis_tree.current()
    board = chess.Board(current_node.fen)
    lines = engine.get_san_lines(board)
    return jsonify({
        'depth': engine.depth,
        'status': engine.status,
        'lines': lines
    })


# ══════════════════════════════════════════════════════════════════════
# PLAY — SOCKET.IO EVENTS
# ══════════════════════════════════════════════════════════════════════

@socketio.on('create_room')
def handle_create_room(data):
    room_id = generate_room_code()
    time_format = data.get('time_format', 600)
    creator_color = data.get('color', 'white')  # 'white', 'black', or 'random'
    
    if creator_color == 'random':
        creator_color = random.choice(['white', 'black'])
    
    room = {
        'game': GameState(),
        'players': {creator_color: request.sid},
        'time_format': time_format,
        'white_time': time_format,
        'black_time': time_format,
        'timer_active': False,
        'game_over': None,
        'game_started': False,
        'creator_color': creator_color,
    }
    rooms[room_id] = room
    join_room(room_id)
    
    emit('room_created', {
        'room_id': room_id,
        'your_color': creator_color,
        'time_format': time_format,
    })

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('room_id', '').upper()
    
    if room_id not in rooms:
        emit('join_error', {'error': 'Camera nu există.'})
        return
    
    room = rooms[room_id]
    
    # Determine which color is available
    if 'white' not in room['players']:
        joiner_color = 'white'
    elif 'black' not in room['players']:
        joiner_color = 'black'
    else:
        emit('join_error', {'error': 'Camera este plină.'})
        return
    
    room['players'][joiner_color] = request.sid
    join_room(room_id)
    
    emit('room_joined', {
        'room_id': room_id,
        'your_color': joiner_color,
        'time_format': room['time_format'],
    })
    
    # Both players connected — start the game
    if len(room['players']) == 2:
        state = build_room_state(room)
        socketio.emit('game_start', {
            'state': state,
            'white_player': 'Jucător 1' if room['creator_color'] == 'white' else 'Jucător 2',
            'black_player': 'Jucător 2' if room['creator_color'] == 'white' else 'Jucător 1',
        }, room=room_id)

@socketio.on('play_move')
def handle_play_move(data):
    room_id = data.get('room_id')
    if room_id not in rooms:
        emit('move_error', {'error': 'Camera nu există.'})
        return
    
    room = rooms[room_id]
    game = room['game']
    
    if room.get('game_over'):
        emit('move_error', {'error': 'Jocul s-a terminat.'})
        return
    
    # Check it's this player's turn
    current_color = 'white' if game.board.turn == chess.WHITE else 'black'
    if room['players'].get(current_color) != request.sid:
        emit('move_error', {'error': 'Nu este rândul tău.'})
        return
    
    from_sq_str = data.get('from')
    to_sq_str = data.get('to')
    promotion = data.get('promotion')
    
    try:
        from_sq = chess.parse_square(from_sq_str)
        to_sq = chess.parse_square(to_sq_str)
        
        move = chess.Move(from_sq, to_sq)
        if move not in game.board.legal_moves:
            promo_move = chess.Move(from_sq, to_sq, promotion=chess.QUEEN)
            if promo_move in game.board.legal_moves and not promotion:
                emit('promotion_required', {
                    'from': from_sq_str,
                    'to': to_sq_str,
                })
                return
            
            if promotion:
                pt = chess.Piece.from_symbol(promotion).piece_type
                move = chess.Move(from_sq, to_sq, promotion=pt)
        
        if move not in game.board.legal_moves:
            emit('move_error', {'error': 'Mutare ilegală.'})
            return
        
        game._apply(move)
        
        # Start timer on first move
        if not room['game_started']:
            room['game_started'] = True
            room['timer_active'] = True
        
        # Check game over
        if game.game_over:
            room['game_over'] = game.game_over
            room['timer_active'] = False
        
        state = build_room_state(room)
        socketio.emit('game_update', {'state': state}, room=room_id)
        
        if room['game_over']:
            if room['game_over'] == 'checkmate':
                winner = 'black' if game.board.turn == chess.WHITE else 'white'
                winner_name = 'Albul' if winner == 'white' else 'Negrul'
                socketio.emit('game_over', {
                    'reason': 'checkmate',
                    'winner': winner,
                    'title': 'Șah-Mat!',
                    'subtitle': f'{winner_name} câștigă!',
                    'icon': '👑'
                }, room=room_id)
            else:
                socketio.emit('game_over', {
                    'reason': 'draw',
                    'winner': None,
                    'title': 'Remiză!',
                    'subtitle': 'Jocul s-a terminat la egalitate.',
                    'icon': '🤝'
                }, room=room_id)
    
    except Exception as e:
        emit('move_error', {'error': str(e)})

@socketio.on('resign')
def handle_resign(data):
    room_id = data.get('room_id')
    if room_id not in rooms:
        return
    
    room = rooms[room_id]
    
    # Find which color resigned
    for color, sid in room['players'].items():
        if sid == request.sid:
            room['game_over'] = 'resign'
            room['timer_active'] = False
            winner = 'white' if color == 'black' else 'black'
            winner_name = 'Albul' if winner == 'white' else 'Negrul'
            socketio.emit('game_over', {
                'reason': 'resign',
                'winner': winner,
                'title': 'Abandon!',
                'subtitle': f'{winner_name} câștigă prin abandon.',
                'icon': '🏳️'
            }, room=room_id)
            break

@socketio.on('disconnect')
def handle_disconnect():
    # Find rooms this player was in
    for room_id, room in list(rooms.items()):
        for color, sid in list(room['players'].items()):
            if sid == request.sid:
                if not room.get('game_over'):
                    room['game_over'] = 'disconnect'
                    room['timer_active'] = False
                    winner = 'white' if color == 'black' else 'black'
                    winner_name = 'Albul' if winner == 'white' else 'Negrul'
                    socketio.emit('game_over', {
                        'reason': 'disconnect',
                        'winner': winner,
                        'title': 'Deconectare!',
                        'subtitle': f'{winner_name} câștigă — adversarul s-a deconectat.',
                        'icon': '🔌'
                    }, room=room_id)
                del room['players'][color]
                # Clean up empty rooms
                if not room['players']:
                    del rooms[room_id]
                break


if __name__ == '__main__':
    # Analyze the starting position
    engine.analyze(chess.Board())
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
