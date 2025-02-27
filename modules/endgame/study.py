from collections import deque
import random
from typing import Optional

import chess
import chess.syzygy

from modules.endgame.generator import EndgameGenerator


class EndgameStudy:
    def __init__(
            self,
            endgame_generator: EndgameGenerator,
    ):
        self.generator = endgame_generator

        self.tablebase_path = endgame_generator.tablebase_path
        self.tablebase = chess.syzygy.open_tablebase(self.tablebase_path)

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
