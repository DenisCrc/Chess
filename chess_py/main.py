"""Main entry point — event loop, input handling."""
import sys
import pygame
import chess

from state import GameState
from engine import StockfishEngine
from renderer import Renderer, WINDOW_W, WINDOW_H, BOARD_X, BOARD_Y, SQ, GAME_X

# ── Stockfish path ─────────────────────────────────────────────────────
# Change this to the full path if 'stockfish' is not on your PATH.
# e.g. r"C:\path\to\stockfish.exe"
STOCKFISH_PATH = r"C:\\Users\\mvcra\\Downloads\\stockfish-windows-x86-64-avx2\\stockfish\\stockfish.exe"


def pixel_to_board(x: int, y: int, game: GameState):
    """Return chess.Square for pixel (x,y) or None if off-board."""
    col = (x - BOARD_X) // SQ
    row = (y - BOARD_Y) // SQ
    if 0 <= row < 8 and 0 <= col < 8:
        return game.display_to_sq(row, col)
    return None


def main():
    pygame.init()
    pygame.display.set_caption("ChessGame ♚")
    screen = pygame.display.set_mode((WINDOW_W, WINDOW_H))

    game     = GameState()
    renderer = Renderer(screen)
    engine   = StockfishEngine(STOCKFISH_PATH)

    clock = pygame.time.Clock()
    result_btn: list = []          # filled by renderer with "New Game" button rect
    need_engine_update = True      # trigger analysis on first frame
    show_time_modal = True         # start with time selection

    while True:
        # ── Engine polling ──────────────────────────────────────────────
        engine.poll()

        # Trigger analysis when engine becomes ready or after a move
        if engine.ready and need_engine_update and game.game_over is None:
            engine.analyze(game.board)
            need_engine_update = False

        # ── Timer tick ──────────────────────────────────────────────────
        dt = clock.tick(60) / 1000.0  # seconds
        game.tick(dt)

        # ── Events ─────────────────────────────────────────────────────
        for event in pygame.event.get():

            # Quit
            if event.type == pygame.QUIT:
                engine.quit()
                pygame.quit()
                sys.exit()

            # ── Mouse button down (click / drag start) ──────────────────
            if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                pos = event.pos

                # Time Selection Modal
                if show_time_modal:
                    secs = renderer.get_time_format_at(pos)
                    if secs is not None:
                        game.initial_time = secs
                        game.white_time = float(secs)
                        game.black_time = float(secs)
                        game.reset()
                        show_time_modal = False
                        need_engine_update = True
                    continue

                # Result modal "New Game"
                for r in result_btn:
                    if r.collidepoint(pos):
                        show_time_modal = True
                        break
                else:
                    # Promotion modal choice
                    if game.pending_promotion:
                        pt = renderer.get_promo_piece_at(pos)
                        if pt is not None:
                            game.complete_promotion(pt)
                            need_engine_update = True

                    # Toolbar buttons
                    elif game.game_over is None:
                        btn = renderer.get_button_at(pos)
                        if btn == "flip":
                            game.is_flipped = not game.is_flipped
                            game.deselect()
                        elif btn == "new":
                            show_time_modal = True

                        # Board click
                        else:
                            sq = pixel_to_board(*pos, game)
                            if sq is not None:
                                piece = game.board.piece_at(sq)

                                # Already have a selection → try to move
                                if game.selected_square is not None:
                                    from_sq = game.selected_square
                                    if sq == from_sq:
                                        # Clicked same square → deselect
                                        game.deselect()
                                    elif piece and piece.color == game.turn:
                                        # Clicked own piece → reselect
                                        game.select(sq)
                                        game.drag_from = sq
                                        game.drag_pos = pos
                                    else:
                                        # Try move (click-to-move)
                                        result = game.try_move(from_sq, sq)
                                        if result == 'ok':
                                            need_engine_update = True
                                            game.timer_active = True
                                        elif result == 'promotion':
                                            pass
                                        else:
                                            game.deselect()
                                else:
                                    # No selection — select if own piece
                                    if piece and piece.color == game.turn:
                                        game.select(sq)
                                        game.drag_from = sq
                                        game.drag_pos = pos

            # ── Mouse motion (drag) ─────────────────────────────────────
            if event.type == pygame.MOUSEMOTION:
                if game.drag_from is not None:
                    game.drag_pos = event.pos

            # ── Mouse button up (click confirm or drop) ─────────────────
            if event.type == pygame.MOUSEBUTTONUP and event.button == 1:
                if game.drag_from is not None and game.game_over is None:
                    pos = event.pos
                    to_sq = pixel_to_board(*pos, game)
                    from_sq = game.drag_from
                    game.drag_from = None
                    game.drag_pos = None

                    if to_sq is not None and to_sq != from_sq:
                        # Dropped on a valid target
                        result = game.try_move(from_sq, to_sq)
                        if result == 'ok':
                            need_engine_update = True
                            game.timer_active = True
                        elif result == 'promotion':
                            pass   # modal shown next frame
                        else:
                            # Drop on own piece → select it
                            piece = game.board.piece_at(to_sq)
                            if piece and piece.color == game.turn:
                                game.select(to_sq)
                            else:
                                game.deselect()
                    else:
                        # Dropped back on same square → keep selected for click
                        if to_sq == from_sq:
                            game.select(from_sq)

            # ── Keyboard shortcuts ──────────────────────────────────────
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_F5 or event.key == pygame.K_r:
                    show_time_modal = True
                elif event.key == pygame.K_f:
                    game.is_flipped = not game.is_flipped
                    game.deselect()
                elif event.key == pygame.K_ESCAPE:
                    game.deselect()

        # ── Click-to-move (no drag): mouseup on same square handled above.
        # Handle second-click move (already have selected_square, user clicks target)
        # This block catches click-to-move without drag:
        # (Logic is implicitly handled — drag_from set on mousedown,
        #  cleared on mouseup. If released on same sq, selection is kept.)

        # ── Render ─────────────────────────────────────────────────────
        renderer.render_frame(game, engine, result_btn, show_time_modal)


if __name__ == "__main__":
    main()
