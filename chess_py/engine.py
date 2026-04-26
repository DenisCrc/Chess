"""Stockfish UCI engine integration — runs in a background thread."""
import subprocess
import threading
import queue
import chess
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class AnalysisLine:
    depth: int
    multipv: int
    score_cp: Optional[int]
    score_mate: Optional[int]
    pv: List[str]   # UCI move strings


def _pv_to_san(pv: List[str], board: chess.Board) -> List[str]:
    """Convert a list of UCI move strings to SAN notation."""
    b = board.copy()
    san = []
    for uci in pv:
        try:
            move = chess.Move.from_uci(uci)
            if move not in b.legal_moves:
                break
            san.append(b.san(move))
            b.push(move)
        except Exception:
            break
    return san


class StockfishEngine:
    def __init__(self, path: str = "stockfish"):
        self.path = path
        self.ready = False
        self.analyzing = False
        self.status = "loading"      # loading | ready | analyzing | error | unavailable
        self.lines: List[Optional[AnalysisLine]] = [None] * 5
        self.depth = 0
        self._lock = threading.Lock()
        self._q: queue.Queue = queue.Queue()
        self._proc: Optional[subprocess.Popen] = None
        self._start()

    # ------------------------------------------------------------------
    def _start(self):
        try:
            self._proc = subprocess.Popen(
                [self.path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                bufsize=1,
            )
            threading.Thread(target=self._reader, daemon=True).start()
            self._send("uci")
        except FileNotFoundError:
            self.status = "unavailable"
        except Exception:
            self.status = "error"

    def _reader(self):
        """Background thread: reads engine stdout into the queue."""
        for line in self._proc.stdout:
            self._q.put(line.rstrip())

    def _send(self, cmd: str):
        if self._proc and self._proc.stdin:
            try:
                self._proc.stdin.write(cmd + "\n")
                self._proc.stdin.flush()
            except Exception:
                pass

    # ------------------------------------------------------------------
    def poll(self):
        """Call from main thread every frame to process engine messages."""
        try:
            while True:
                self._handle(self._q.get_nowait())
        except queue.Empty:
            pass

    def _handle(self, line: str):
        if line == "uciok":
            self._send("setoption name MultiPV value 5")
            self._send("isready")
        elif line == "readyok":
            self.ready = True
            self.status = "ready"
        elif line.startswith("info") and " pv " in line:
            self._parse_info(line)
        elif line.startswith("bestmove"):
            self.analyzing = False
            if self.status == "analyzing":
                self.status = "ready"

    def _parse_info(self, line: str):
        tokens = line.split()
        depth = multipv = 0
        score_cp: Optional[int] = None
        score_mate: Optional[int] = None
        pv: List[str] = []
        i = 0
        while i < len(tokens):
            t = tokens[i]
            if t == "depth" and i + 1 < len(tokens):
                depth = int(tokens[i + 1]); i += 2
            elif t == "multipv" and i + 1 < len(tokens):
                multipv = int(tokens[i + 1]); i += 2
            elif t == "score" and i + 2 < len(tokens):
                if tokens[i + 1] == "cp":
                    score_cp = int(tokens[i + 2])
                elif tokens[i + 1] == "mate":
                    score_mate = int(tokens[i + 2])
                i += 3
            elif t == "pv":
                pv = tokens[i + 1:]
                break
            else:
                i += 1

        if 1 <= multipv <= 5 and pv:
            with self._lock:
                self.lines[multipv - 1] = AnalysisLine(
                    depth, multipv, score_cp, score_mate, pv
                )
                if multipv == 1:
                    self.depth = depth

    # ------------------------------------------------------------------
    def analyze(self, board: chess.Board):
        if not self.ready or not self._proc:
            return
        self._send("stop")
        with self._lock:
            self.lines = [None] * 5
            self.depth = 0
        self.analyzing = True
        self.status = "analyzing"
        self._send(f"position fen {board.fen()}")
        self._send("go depth 20")

    def stop(self):
        self._send("stop")
        self.analyzing = False

    def quit(self):
        try:
            self._send("quit")
            if self._proc:
                self._proc.wait(timeout=2)
        except Exception:
            pass

    def get_lines(self) -> List[Optional[AnalysisLine]]:
        with self._lock:
            return list(self.lines)

    def get_san_lines(self, board: chess.Board):
        """Return list of (score_str, san_moves_list) for each line."""
        result = []
        for line in self.get_lines():
            if line is None:
                result.append(None)
                continue
            # Score string (white's perspective)
            if line.score_mate is not None:
                score_str = f"M{abs(line.score_mate)}"
                is_positive = line.score_mate > 0
                is_mate = True
            else:
                cp = line.score_cp or 0
                # UCI score is from side-to-move perspective → convert to white's
                adjusted = cp if board.turn else -cp
                score_str = f"{'+' if adjusted >= 0 else ''}{adjusted / 100:.2f}"
                is_positive = adjusted >= 0
                is_mate = False
            san_moves = _pv_to_san(line.pv, board)
            result.append({
                "score": score_str,
                "is_positive": is_positive,
                "is_mate": is_mate,
                "moves": san_moves,
                "depth": line.depth,
            })
        return result
