"""Game state — wraps python-chess Board with UI state."""
import chess

PIECE_SYMBOLS = {
    'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔',
    'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
}

PIECE_VALUES = {
    chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3,
    chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0,
}


class GameState:
    def __init__(self):
        self.board = chess.Board()
        self.is_flipped = False
        self.selected_square = None   # chess.Square | None
        self.drag_from = None         # chess.Square | None
        self.drag_pos = None          # (x, y) mouse during drag
        self.last_move = None         # chess.Move | None
        self.captured = {chess.WHITE: [], chess.BLACK: []}
        self.legal_targets = set()    # to_squares for selected piece
        self.game_over = None         # None | 'checkmate' | 'draw' | 'timeout'
        self.pending_promotion = None # (from_sq, to_sq) | None
        
        # Timer state
        self.initial_time = 600      # seconds
        self.white_time = 600.0
        self.black_time = 600.0
        self.game_started = False
        self.timer_active = False

    # ------------------------------------------------------------------
    def reset(self):
        self.__init__()
        self.is_flipped = self.is_flipped  # preserve flip preference

    # ------------------------------------------------------------------
    # Coordinate helpers
    # ------------------------------------------------------------------
    def sq_to_display(self, sq: chess.Square):
        """Return (row, col) display coords where (0,0) is top-left."""
        file = chess.square_file(sq)
        rank = chess.square_rank(sq)
        if not self.is_flipped:
            return 7 - rank, file
        else:
            return rank, 7 - file

    def display_to_sq(self, row: int, col: int) -> chess.Square:
        """Convert display (row, col) → chess.Square."""
        if not self.is_flipped:
            return chess.square(col, 7 - row)
        else:
            return chess.square(7 - col, row)

    # ------------------------------------------------------------------
    # Selection / legal moves
    # ------------------------------------------------------------------
    def get_legal_from(self, sq: chess.Square):
        return [m for m in self.board.legal_moves if m.from_square == sq]

    def select(self, sq: chess.Square):
        self.selected_square = sq
        self.legal_targets = {m.to_square for m in self.get_legal_from(sq)}

    def deselect(self):
        self.selected_square = None
        self.legal_targets = set()

    # ------------------------------------------------------------------
    # Move execution
    # ------------------------------------------------------------------
    def try_move(self, from_sq: chess.Square, to_sq: chess.Square):
        """Returns 'ok', 'promotion', or None (illegal)."""
        moves = [m for m in self.get_legal_from(from_sq) if m.to_square == to_sq]
        if not moves:
            return None
        if any(m.promotion for m in moves):
            self.pending_promotion = (from_sq, to_sq)
            self.deselect()
            return 'promotion'
        self._apply(moves[0])
        return 'ok'

    def complete_promotion(self, piece_type: int):
        if not self.pending_promotion:
            return
        from_sq, to_sq = self.pending_promotion
        move = chess.Move(from_sq, to_sq, promotion=piece_type)
        self._apply(move)
        self.pending_promotion = None
        self.timer_active = True

    def _apply(self, move: chess.Move):
        # Track captured piece
        if self.board.is_en_passant(move):
            ep_sq = move.to_square + (8 if self.board.turn == chess.BLACK else -8)
            cap = self.board.piece_at(ep_sq)
        else:
            cap = self.board.piece_at(move.to_square)

        if cap:
            self.captured[self.board.turn].append(cap)
            self.captured[self.board.turn].sort(
                key=lambda p: PIECE_VALUES[p.piece_type], reverse=True
            )

        self.board.push(move)
        self.last_move = move
        self.deselect()

        if self.board.is_checkmate():
            self.game_over = 'checkmate'
        elif (self.board.is_stalemate()
              or self.board.is_insufficient_material()
              or self.board.is_seventyfive_moves()
              or self.board.is_fivefold_repetition()):
            self.game_over = 'draw'

    def tick(self, dt: float):
        """Update clocks. dt is seconds elapsed since last frame."""
        if not self.timer_active or self.game_over:
            return
            
        if self.board.turn == chess.WHITE:
            self.white_time -= dt
            if self.white_time <= 0:
                self.white_time = 0
                self.game_over = 'timeout'
        else:
            self.black_time -= dt
            if self.black_time <= 0:
                self.black_time = 0
                self.game_over = 'timeout'

    # ------------------------------------------------------------------
    # Convenience
    # ------------------------------------------------------------------
    @property
    def turn(self):
        return self.board.turn   # chess.WHITE or chess.BLACK

    def piece_symbol(self, sq: chess.Square) -> str:
        p = self.board.piece_at(sq)
        if p is None:
            return ''
        return PIECE_SYMBOLS[p.symbol()]
