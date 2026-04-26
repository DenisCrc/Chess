"""All Pygame rendering — board, pieces, UI panels, modals."""
import pygame
import chess
from state import GameState, PIECE_SYMBOLS, PIECE_VALUES

# ── Window / layout ────────────────────────────────────────────────────
WINDOW_W, WINDOW_H = 1300, 870
PANEL_W = 292          # left engine panel width

SQ = 80                # square size in pixels
BOARD_PIX = SQ * 8    # 640

GAME_X = PANEL_W
GAME_W = WINDOW_W - PANEL_W   # 1008

# Board centred in game area, with room for rank labels
RANK_LBL_W = 22
BOARD_X = GAME_X + (GAME_W - BOARD_PIX) // 2   # 300+184 = 484 approx

PLAYER_BAR_H = 58
TOP_BAR_Y = 14
FILE_LBL_H = 20
BOARD_Y = TOP_BAR_Y + PLAYER_BAR_H + FILE_LBL_H + 6   # ≈ 98
BOTTOM_FILE_Y = BOARD_Y + BOARD_PIX + 2
BOTTOM_BAR_Y = BOTTOM_FILE_Y + FILE_LBL_H + 4
TURN_Y = BOTTOM_BAR_Y + PLAYER_BAR_H + 8
BTN_Y = TURN_Y + 44

# ── Colours ────────────────────────────────────────────────────────────
C = {
    "bg":           (10,  10,  22),
    "panel_bg":     (16,  16,  34),
    "panel_border": (40,  40,  80),
    "sq_light":     (240, 217, 181),
    "sq_dark":      (181, 136,  99),
    "selected":     (246, 246, 105),
    "last_move":    (205, 210, 100),
    "check":        (220,  50,  50),
    "valid_dot":    (0,   0,   0),
    "valid_cap":    (220,  50,  50),
    "drag_src":     (120, 160,  80),
    "text":         (226, 232, 240),
    "text_dim":     (120, 130, 160),
    "accent":       ( 99, 102, 241),
    "btn_pri":      ( 79,  70, 229),
    "btn_sec":      ( 40,  40,  80),
    "white_piece":  (255, 255, 255),
    "black_piece":  ( 24,  24,  24),
    "modal_bg":     ( 22,  22,  48),
    "modal_border": ( 80,  80, 180),
    "active_bar":   ( 30,  30,  60),
    "score_pos":    ( 80, 220, 120),
    "score_neg":    (220,  80,  80),
    "score_mate":   (230, 180,  50),
    "score_neu":    (150, 160, 200),
    "status_rdy":   ( 80, 200, 120),
    "status_ana":   (200, 160,  60),
    "status_err":   (220,  80,  80),
    "status_load":  (100, 120, 200),
}

FILES = "abcdefgh"
RANKS = "87654321"


def _try_font(names, size, bold=False):
    for name in names:
        path = pygame.font.match_font(name, bold=bold)
        if path:
            return pygame.font.Font(path, size)
    return pygame.font.SysFont(None, size)


class Renderer:
    def __init__(self, screen: pygame.Surface):
        self.screen = screen
        self._load_fonts()
        self._button_rects: dict = {}

    def _load_fonts(self):
        # Piece font — needs Unicode chess glyphs
        piece_candidates = [
            "segoeuisymbol", "seguisym", "notosans", "dejavusans",
            "freesans", "arial", "unifont",
        ]
        self.font_piece_lg = _try_font(piece_candidates, 62)
        self.font_piece_sm = _try_font(piece_candidates, 32)
        self.font_piece_drag = _try_font(piece_candidates, 70)

        ui_candidates = ["inter", "segoeui", "calibri", "helvetica", "arial"]
        self.font_ui_sm = _try_font(ui_candidates, 14)
        self.font_ui    = _try_font(ui_candidates, 17)
        self.font_ui_md = _try_font(ui_candidates, 19, bold=True)
        self.font_ui_lg = _try_font(ui_candidates, 22, bold=True)
        self.font_label = _try_font(ui_candidates, 13)
        self.font_title = _try_font(ui_candidates, 28, bold=True)
        self.font_score = _try_font(["jetbrainsmono","couriernew","consolas","mono"], 15, bold=True)

    # ── helpers ────────────────────────────────────────────────────────
    def _sq_pixel(self, row, col):
        """Top-left pixel of display (row, col)."""
        return BOARD_X + col * SQ, BOARD_Y + row * SQ

    def _draw_rect_alpha(self, color_rgb, alpha, rect):
        surf = pygame.Surface((rect[2], rect[3]), pygame.SRCALPHA)
        surf.fill((*color_rgb, alpha))
        self.screen.blit(surf, (rect[0], rect[1]))

    def _draw_rounded(self, surface, color, rect, radius=8):
        pygame.draw.rect(surface, color, rect, border_radius=radius)

    def _text(self, font, text, color, center=None, topleft=None):
        surf = font.render(text, True, color)
        r = surf.get_rect()
        if center:
            r.center = center
        elif topleft:
            r.topleft = topleft
        self.screen.blit(surf, r)
        return r

    # ── background ─────────────────────────────────────────────────────
    def draw_background(self):
        self.screen.fill(C["bg"])
        # subtle gradient on game area (top brighter)
        for y in range(0, WINDOW_H, 2):
            alpha = int(6 * (1 - y / WINDOW_H))
            s = pygame.Surface((GAME_W, 2), pygame.SRCALPHA)
            s.fill((255, 255, 255, alpha))
            self.screen.blit(s, (GAME_X, y))

    # ── engine panel ───────────────────────────────────────────────────
    def draw_engine_panel(self, engine, game: GameState):
        # Background
        pygame.draw.rect(self.screen, C["panel_bg"], (0, 0, PANEL_W, WINDOW_H))
        pygame.draw.line(self.screen, C["panel_border"],
                         (PANEL_W - 1, 0), (PANEL_W - 1, WINDOW_H), 1)

        # Header
        hdr_y = 20
        self._text(self.font_ui_lg, "⚡  Analiză Motor",
                   C["accent"], topleft=(18, hdr_y))

        # Status dot + label
        status_colors = {
            "loading":     C["status_load"],
            "ready":       C["status_rdy"],
            "analyzing":   C["status_ana"],
            "error":       C["status_err"],
            "unavailable": C["status_err"],
        }
        dot_color = status_colors.get(engine.status, C["text_dim"])
        pygame.draw.circle(self.screen, dot_color, (18, hdr_y + 34), 5)
        status_labels = {
            "loading":     "Se încarcă...",
            "ready":       "Pregătit",
            "analyzing":   "Analizează...",
            "error":       "Eroare",
            "unavailable": "Stockfish lipsă",
        }
        self._text(self.font_ui_sm,
                   status_labels.get(engine.status, engine.status),
                   dot_color, topleft=(28, hdr_y + 26))

        depth_text = f"Adâncime: {engine.depth if engine.depth else '—'}"
        self._text(self.font_ui_sm, depth_text, C["text_dim"],
                   topleft=(18, hdr_y + 46))

        # Divider
        div_y = hdr_y + 68
        pygame.draw.line(self.screen, C["panel_border"],
                         (12, div_y), (PANEL_W - 12, div_y))

        lines = engine.get_san_lines(game.board)

        for i, data in enumerate(lines):
            line_y = div_y + 16 + i * 126
            row_rect = pygame.Rect(8, line_y - 4, PANEL_W - 16, 116)

            # Row background
            row_bg = C["active_bar"] if i == 0 else C["panel_bg"]
            pygame.draw.rect(self.screen, row_bg, row_rect, border_radius=8)
            if i == 0:
                pygame.draw.rect(self.screen, C["accent"],
                                 row_rect, width=1, border_radius=8)

            # Rank badge
            badge_rect = pygame.Rect(16, line_y + 2, 26, 26)
            pygame.draw.rect(self.screen, C["accent"], badge_rect, border_radius=5)
            self._text(self.font_ui_sm, f"#{i+1}", C["text"],
                       center=badge_rect.center)

            if data is None:
                self._text(self.font_ui_sm, "Se așteaptă analiza…",
                           C["text_dim"], topleft=(50, line_y + 8))
                continue

            # Score
            if data["is_mate"]:
                sc = C["score_mate"]
            elif data["is_positive"]:
                sc = C["score_pos"]
            else:
                sc = C["score_neg"]

            score_surf = self.font_score.render(data["score"], True, sc)
            self.screen.blit(score_surf, (50, line_y + 6))

            # Best move
            moves = data["moves"]
            best = moves[0] if moves else "—"
            self._text(self.font_ui_md, best, C["text"],
                       topleft=(16, line_y + 36))

            # Continuation
            cont = " ".join(moves[1:7]) if len(moves) > 1 else ""
            if cont:
                # Word-wrap manually to ~PANEL_W-30 width
                words = cont.split()
                lines_txt, cur = [], ""
                for w in words:
                    test = (cur + " " + w).strip()
                    if self.font_ui_sm.size(test)[0] < PANEL_W - 30:
                        cur = test
                    else:
                        lines_txt.append(cur)
                        cur = w
                lines_txt.append(cur)
                for j, l in enumerate(lines_txt[:2]):
                    self._text(self.font_ui_sm, l, C["text_dim"],
                               topleft=(16, line_y + 62 + j * 18))

        # Footer note
        self._text(self.font_ui_sm, "Stockfish · 5 linii · depth 20",
                   C["text_dim"],
                   center=(PANEL_W // 2, WINDOW_H - 16))

    # ── board squares ──────────────────────────────────────────────────
    def draw_board(self, game: GameState):
        for row in range(8):
            for col in range(8):
                sq = game.display_to_sq(row, col)
                x, y = self._sq_pixel(row, col)
                light = (row + col) % 2 == 0
                base = C["sq_light"] if light else C["sq_dark"]
                pygame.draw.rect(self.screen, base, (x, y, SQ, SQ))

                # Last move highlight
                if game.last_move and sq in (game.last_move.from_square,
                                             game.last_move.to_square):
                    self._draw_rect_alpha(C["last_move"], 140, (x, y, SQ, SQ))

                # In-check king
                if game.board.is_check():
                    king_sq = game.board.king(game.turn)
                    if sq == king_sq:
                        self._draw_rect_alpha(C["check"], 180, (x, y, SQ, SQ))

                # Selected square
                if sq == game.selected_square:
                    self._draw_rect_alpha(C["selected"], 170, (x, y, SQ, SQ))

                # Drag source
                if sq == game.drag_from and sq != game.selected_square:
                    self._draw_rect_alpha(C["drag_src"], 110, (x, y, SQ, SQ))

        # Valid move overlays
        for tgt in game.legal_targets:
            row, col = game.sq_to_display(tgt)
            x, y = self._sq_pixel(row, col)
            occupied = game.board.piece_at(tgt) is not None
            if occupied:
                # Red ring around capture target
                pygame.draw.circle(self.screen, C["valid_cap"],
                                   (x + SQ // 2, y + SQ // 2), SQ // 2 - 3, 5)
            else:
                dot_surf = pygame.Surface((SQ, SQ), pygame.SRCALPHA)
                pygame.draw.circle(dot_surf, (*C["valid_dot"], 55),
                                   (SQ // 2, SQ // 2), SQ // 6)
                self.screen.blit(dot_surf, (x, y))

    # ── rank/file labels ───────────────────────────────────────────────
    def draw_labels(self, game: GameState):
        files = FILES if not game.is_flipped else FILES[::-1]
        ranks = RANKS if not game.is_flipped else RANKS[::-1]

        for i in range(8):
            # File labels (bottom)
            fx = BOARD_X + i * SQ + SQ // 2
            self._text(self.font_label, files[i], C["text_dim"],
                       center=(fx, BOTTOM_FILE_Y + FILE_LBL_H // 2))
            # Rank labels (left)
            ry = BOARD_Y + i * SQ + SQ // 2
            self._text(self.font_label, ranks[i], C["text_dim"],
                       center=(BOARD_X - 12, ry))

    # ── pieces ─────────────────────────────────────────────────────────
    def draw_pieces(self, game: GameState):
        for row in range(8):
            for col in range(8):
                sq = game.display_to_sq(row, col)
                if sq == game.drag_from:
                    continue   # drawn under cursor instead
                piece = game.board.piece_at(sq)
                if piece:
                    self._draw_piece(piece, *self._sq_pixel(row, col), SQ)

    def _draw_piece(self, piece: chess.Piece, x, y, size):
        sym = PIECE_SYMBOLS[piece.symbol()]
        font = self.font_piece_lg
        color = C["white_piece"] if piece.color == chess.WHITE else C["black_piece"]
        shadow = C["black_piece"] if piece.color == chess.WHITE else C["sq_dark"]
        # Shadow
        s_surf = font.render(sym, True, (*shadow, 120))
        s_r = s_surf.get_rect(center=(x + size // 2 + 2, y + size // 2 + 2))
        tmp = pygame.Surface((size, size), pygame.SRCALPHA)
        tmp.blit(s_surf, (s_r.x - x, s_r.y - y))
        self.screen.blit(tmp, (x, y))
        # Piece
        p_surf = font.render(sym, True, color)
        p_r = p_surf.get_rect(center=(x + size // 2, y + size // 2))
        self.screen.blit(p_surf, p_r)

    def draw_drag_piece(self, game: GameState):
        """Draw piece being dragged at mouse position."""
        if game.drag_from is None or game.drag_pos is None:
            return
        piece = game.board.piece_at(game.drag_from)
        if piece is None:
            return
        sym = PIECE_SYMBOLS[piece.symbol()]
        color = C["white_piece"] if piece.color == chess.WHITE else C["black_piece"]
        surf = self.font_piece_drag.render(sym, True, color)
        r = surf.get_rect(center=game.drag_pos)
        self.screen.blit(surf, r)

    # ── player bars ────────────────────────────────────────────────────
    def draw_player_bars(self, game: GameState):
        top_color = chess.BLACK if not game.is_flipped else chess.WHITE
        bot_color = chess.WHITE if not game.is_flipped else chess.BLACK

        self._draw_player_bar(top_color, TOP_BAR_Y, game, top=True)
        self._draw_player_bar(bot_color, BOTTOM_BAR_Y, game, top=False)

    def _draw_player_bar(self, color, y, game: GameState, top: bool):
        active = game.turn == color and game.game_over is None
        bg = C["active_bar"] if active else C["panel_bg"]
        rect = pygame.Rect(GAME_X + 10, y, GAME_W - 20, PLAYER_BAR_H)
        pygame.draw.rect(self.screen, bg, rect, border_radius=10)
        if active:
            pygame.draw.rect(self.screen, C["accent"], rect,
                             width=1, border_radius=10)

        # Avatar + name
        sym, name = ("♔", "Alb") if color == chess.WHITE else ("♚", "Negru")
        self._text(self.font_piece_sm, sym, C["text"],
                   topleft=(GAME_X + 22, y + 8))
        self._text(self.font_ui_md, name, C["text"],
                   topleft=(GAME_X + 60, y + 10))

        # Captured pieces
        captured = game.captured[color]   # pieces captured BY this color
        cap_str = "".join(PIECE_SYMBOLS[p.symbol()] for p in captured)
        self._text(self.font_ui_sm, cap_str, C["text_dim"],
                   topleft=(GAME_X + 60, y + 33))

        # Active pulse dot
        if active:
            pygame.draw.circle(self.screen, C["accent"],
                               (GAME_X + GAME_W - 22, y + PLAYER_BAR_H // 2), 5)

    # ── turn indicator ─────────────────────────────────────────────────
    def draw_turn_indicator(self, game: GameState):
        if game.game_over:
            return
        in_check = game.board.is_check()
        is_white = game.turn == chess.WHITE
        dot_c = (230, 230, 230) if is_white else (50, 50, 50)
        turn_txt = "Rândul Albului" if is_white else "Rândul Negrului"
        if in_check:
            turn_txt += "  —  ȘAH!"

        cx = GAME_X + GAME_W // 2
        pygame.draw.circle(self.screen, dot_c, (cx - 90, TURN_Y + 16), 8)
        pygame.draw.circle(self.screen, C["panel_border"], (cx - 90, TURN_Y + 16), 8, 1)
        color = C["check"] if in_check else C["text"]
        self._text(self.font_ui_md, turn_txt, color,
                   center=(cx, TURN_Y + 16))

    # ── buttons ────────────────────────────────────────────────────────
    def draw_buttons(self, game: GameState):
        cx = GAME_X + GAME_W // 2
        btn_w, btn_h = 160, 40
        gap = 20

        flip_rect = pygame.Rect(cx - btn_w - gap // 2, BTN_Y, btn_w, btn_h)
        new_rect  = pygame.Rect(cx + gap // 2,          BTN_Y, btn_w, btn_h)

        mouse = pygame.mouse.get_pos()
        for rect, label, base_c in [
            (flip_rect, "⟳  Rotește Tabla", C["btn_sec"]),
            (new_rect,  "✦  Joc Nou",        C["btn_pri"]),
        ]:
            hover = rect.collidepoint(mouse)
            c = tuple(min(255, v + 20) for v in base_c) if hover else base_c
            self._draw_rounded(self.screen, c, rect, radius=8)
            pygame.draw.rect(self.screen, C["panel_border"], rect,
                             width=1, border_radius=8)
            self._text(self.font_ui_md, label, C["text"], center=rect.center)

        self._button_rects = {"flip": flip_rect, "new": new_rect}

    def get_button_at(self, pos):
        for name, rect in self._button_rects.items():
            if rect.collidepoint(pos):
                return name
        return None

    # ── promotion modal ────────────────────────────────────────────────
    def draw_promotion_modal(self, game: GameState):
        if not game.pending_promotion:
            return
        color = game.board.turn
        pieces = ([chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT]
                  if color == chess.WHITE
                  else [chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT])

        overlay = pygame.Surface((WINDOW_W, WINDOW_H), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 160))
        self.screen.blit(overlay, (0, 0))

        box_w, box_h = 380, 160
        box_x = (WINDOW_W - box_w) // 2
        box_y = (WINDOW_H - box_h) // 2
        pygame.draw.rect(self.screen, C["modal_bg"],
                         (box_x, box_y, box_w, box_h), border_radius=14)
        pygame.draw.rect(self.screen, C["modal_border"],
                         (box_x, box_y, box_w, box_h), width=2, border_radius=14)

        self._text(self.font_ui_lg, "Alege Promovarea", C["text"],
                   center=(WINDOW_W // 2, box_y + 28))

        btn_size = 70
        total = len(pieces) * btn_size + (len(pieces) - 1) * 12
        sx = (WINDOW_W - total) // 2
        sy = box_y + 56
        self._promo_rects = {}
        mouse = pygame.mouse.get_pos()

        for pt in pieces:
            piece = chess.Piece(pt, color)
            sym = PIECE_SYMBOLS[piece.symbol()]
            rect = pygame.Rect(sx, sy, btn_size, btn_size)
            hover = rect.collidepoint(mouse)
            bg = C["btn_pri"] if hover else C["btn_sec"]
            pygame.draw.rect(self.screen, bg, rect, border_radius=10)
            pygame.draw.rect(self.screen, C["modal_border"], rect,
                             width=1, border_radius=10)
            pc = C["white_piece"] if color == chess.WHITE else C["black_piece"]
            self._text(self.font_piece_sm, sym, pc, center=rect.center)
            self._promo_rects[pt] = rect
            sx += btn_size + 12

    def get_promo_piece_at(self, pos):
        for pt, rect in getattr(self, '_promo_rects', {}).items():
            if rect.collidepoint(pos):
                return pt
        return None

    # ── result modal ───────────────────────────────────────────────────
    def draw_result_modal(self, game: GameState, on_new_game_rect_out: list):
        if not game.game_over:
            return
        overlay = pygame.Surface((WINDOW_W, WINDOW_H), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 170))
        self.screen.blit(overlay, (0, 0))

        box_w, box_h = 420, 230
        bx = (WINDOW_W - box_w) // 2
        by = (WINDOW_H - box_h) // 2
        pygame.draw.rect(self.screen, C["modal_bg"], (bx, by, box_w, box_h), border_radius=16)
        pygame.draw.rect(self.screen, C["modal_border"], (bx, by, box_w, box_h),
                         width=2, border_radius=16)

        if game.game_over == 'checkmate':
            winner = "Albul" if game.turn == chess.BLACK else "Negrul"
            title, sub, icon = "Șah-Mat!", f"{winner} câștigă!", "👑"
        else:
            title, sub, icon = "Pat!", "Jocul s-a terminat la egalitate.", "🤝"

        self._text(self.font_title, icon + "  " + title, C["text"],
                   center=(WINDOW_W // 2, by + 60))
        self._text(self.font_ui_lg, sub, C["text_dim"],
                   center=(WINDOW_W // 2, by + 110))

        btn_rect = pygame.Rect(WINDOW_W // 2 - 90, by + 150, 180, 44)
        mouse = pygame.mouse.get_pos()
        bg = tuple(min(255, v + 20) for v in C["btn_pri"]) \
            if btn_rect.collidepoint(mouse) else C["btn_pri"]
        pygame.draw.rect(self.screen, bg, btn_rect, border_radius=10)
        self._text(self.font_ui_md, "Joc Nou", C["text"], center=btn_rect.center)
        on_new_game_rect_out.clear()
        on_new_game_rect_out.append(btn_rect)

    # ── full frame ─────────────────────────────────────────────────────
    def render_frame(self, game: GameState, engine,
                     result_btn_out: list):
        self.draw_background()
        self.draw_engine_panel(engine, game)
        self.draw_player_bars(game)
        self.draw_labels(game)
        self.draw_board(game)
        self.draw_pieces(game)
        self.draw_drag_piece(game)
        self.draw_turn_indicator(game)
        self.draw_buttons(game)
        self.draw_promotion_modal(game)
        self.draw_result_modal(game, result_btn_out)
        pygame.display.flip()
