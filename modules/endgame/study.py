from collections import deque
import random
from typing import Optional, Tuple

import chess
import chess.syzygy

from modules.endgame.generator import EndgameGenerator


class EndgameStudy:
    def __init__(
            self,
            endgame_generator: EndgameGenerator,
    ):
        self.generator = endgame_generator

        self.board = chess.Board()
        self.history = deque()
        self.starting_position: Optional[str] = None

    def draw_position(
            self,
            dtz: int,
            white: bool = True,
            bishop_color: Optional[bool] = None
    ):
        bishop_color = bishop_color if bishop_color is not None else bool(random.getrandbits(1))
        choices = self.generator.find_positions(dtz, white, white, bishop_color)
        return random.choice(choices)

    def start_game(
            self,
            dtz: int,
            white: bool = True,
            bishop_color: Optional[bool] = None
    ) -> str:
        self.starting_position = self.draw_position(dtz, white, bishop_color)
        self.board = chess.Board(self.starting_position)
        self.history.clear()
        return self.starting_position

    def play_move(self, move: str):
        self.board.push(chess.Move.from_uci(move))
        self.history.append(move)

    def reply(self) -> str:
        legal_moves = list(self.board.legal_moves)
        replies = {}

        for move in legal_moves:
            self.board.push(move)
            dtz = self.generator.tablebase.probe_dtz(self.board)
            if dtz is not None:
                replies[move] = dtz if dtz > 0 else float('inf')
            self.board.pop()

        if not replies:
            raise ValueError("No legal moves with DTZ found")

        max_dtz = max(replies.values())
        best_moves = [move for move, dtz in replies.items() if dtz == max_dtz]
        best_move = random.choice(best_moves)
        return best_move.uci()

    def move(self, move: str) -> Tuple[str, str]:
        self.play_move(move)
        reply = self.reply()
        self.play_move(reply)
        return reply, self.board.fen()
