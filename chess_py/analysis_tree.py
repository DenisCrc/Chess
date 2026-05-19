"""
AnalysisTree — A branching move-tree for the analysis board.

Each node stores a FEN position and the UCI/SAN move that led to it.
Multiple children per node = multiple branches.
"""
import uuid
import chess


class AnalysisNode:
    def __init__(self, fen: str, move_san=None, move_uci=None, parent_id=None, depth=0):
        self.id = str(uuid.uuid4())
        self.fen = fen
        self.move_san = move_san    # SAN of the move that arrived here (None for root)
        self.move_uci = move_uci    # UCI of the move that arrived here (None for root)
        self.parent_id = parent_id  # None for root
        self.children = []          # ordered list of child node IDs
        self.depth = depth          # ply depth from root (0 = starting position)

    def to_dict(self):
        return {
            'id': self.id,
            'fen': self.fen,
            'move_san': self.move_san,
            'move_uci': self.move_uci,
            'parent_id': self.parent_id,
            'children': self.children,
            'depth': self.depth,
        }


class AnalysisTree:
    def __init__(self):
        self.nodes = {}
        self.root_id = None
        self.current_id = None
        self.reset()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    def reset(self):
        root_fen = chess.Board().fen()
        root = AnalysisNode(fen=root_fen)
        self.nodes = {root.id: root}
        self.root_id = root.id
        self.current_id = root.id

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------
    def get(self, node_id: str) -> AnalysisNode | None:
        return self.nodes.get(node_id)

    def current(self) -> AnalysisNode:
        return self.nodes[self.current_id]

    def navigate_to(self, node_id: str) -> AnalysisNode:
        if node_id not in self.nodes:
            raise KeyError(f'Node {node_id} not found')
        self.current_id = node_id
        return self.nodes[node_id]

    def make_move(self, from_sq_str: str, to_sq_str: str, promotion: str | None,
                  from_node_id: str | None = None) -> tuple[AnalysisNode, bool]:
        """
        Make a move from a specific node (defaults to current node).

        Returns (new_node, is_new_branch):
          - is_new_branch=False if the move already existed as a child (just navigated there)
          - is_new_branch=True  if a new branch was created
        
        Raises ValueError for illegal moves.
        Raises KeyError if from_node_id is unknown.
        """
        source_id = from_node_id or self.current_id
        source_node = self.nodes[source_id]

        board = chess.Board(source_node.fen)

        from_sq = chess.parse_square(from_sq_str)
        to_sq   = chess.parse_square(to_sq_str)

        # Build the move, handling promotion
        move = chess.Move(from_sq, to_sq)
        if move not in board.legal_moves:
            promo_move = chess.Move(from_sq, to_sq, promotion=chess.QUEEN)
            if promo_move in board.legal_moves and not promotion:
                raise PromotionRequired()
            if promotion:
                pt = chess.Piece.from_symbol(promotion).piece_type
                move = chess.Move(from_sq, to_sq, promotion=pt)

        if move not in board.legal_moves:
            raise ValueError('Illegal move')

        move_uci = move.uci()
        move_san = board.san(move)

        # Check for existing child with the same UCI move
        for child_id in source_node.children:
            child = self.nodes[child_id]
            if child.move_uci == move_uci:
                # Already exists — just navigate there
                self.current_id = child_id
                return child, False

        # New branch — apply the move and create a child node
        board.push(move)
        new_fen = board.fen()

        child = AnalysisNode(
            fen=new_fen,
            move_san=move_san,
            move_uci=move_uci,
            parent_id=source_id,
            depth=source_node.depth + 1,
        )
        self.nodes[child.id] = child
        source_node.children.append(child.id)
        self.current_id = child.id
        return child, True

    # ------------------------------------------------------------------
    # Navigation helpers
    # ------------------------------------------------------------------
    def parent_of(self, node_id: str) -> AnalysisNode | None:
        node = self.nodes.get(node_id)
        if node and node.parent_id:
            return self.nodes.get(node.parent_id)
        return None

    def first_child_of(self, node_id: str) -> AnalysisNode | None:
        node = self.nodes.get(node_id)
        if node and node.children:
            return self.nodes.get(node.children[0])
        return None

    def path_to_root(self, node_id: str) -> list[AnalysisNode]:
        """Returns the list of nodes from root to node_id (inclusive)."""
        path = []
        nid = node_id
        while nid:
            node = self.nodes.get(nid)
            if not node:
                break
            path.append(node)
            nid = node.parent_id
        path.reverse()
        return path

    def deepest_main_line(self, start_id: str | None = None) -> AnalysisNode:
        """Follow first-child chain from start_id to the deepest leaf."""
        nid = start_id or self.root_id
        while True:
            node = self.nodes[nid]
            if not node.children:
                return node
            nid = node.children[0]

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------
    def serialize(self) -> dict:
        """Return full tree + current node info for the frontend."""
        current = self.current()
        board = chess.Board(current.fen)

        # Build captured pieces by replaying from root to current
        path = self.path_to_root(self.current_id)
        captured = {chess.WHITE: [], chess.BLACK: []}
        temp = chess.Board()
        for node in path[1:]:  # skip root (no move)
            move = chess.Move.from_uci(node.move_uci)
            if temp.is_en_passant(move):
                ep_sq = move.to_square + (8 if temp.turn == chess.BLACK else -8)
                cap = temp.piece_at(ep_sq)
            else:
                cap = temp.piece_at(move.to_square)
            if cap:
                captured[temp.turn].append(cap.symbol())
            temp.push(move)

        # Last move
        last_move_uci = current.move_uci

        return {
            'current_node_id': self.current_id,
            'root_id': self.root_id,
            'nodes': {nid: n.to_dict() for nid, n in self.nodes.items()},
            'fen': current.fen,
            'turn': 'white' if board.turn == chess.WHITE else 'black',
            'game_over': self._check_game_over(board),
            'last_move': last_move_uci,
            'is_check': board.is_check(),
            'captured': {
                'white': captured[chess.WHITE],
                'black': captured[chess.BLACK],
            },
        }

    @staticmethod
    def _check_game_over(board: chess.Board):
        if board.is_checkmate():
            return 'checkmate'
        if (board.is_stalemate() or board.is_insufficient_material()
                or board.is_seventyfive_moves() or board.is_fivefold_repetition()):
            return 'draw'
        return None


class PromotionRequired(Exception):
    pass
