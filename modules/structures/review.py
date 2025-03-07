import base64
import io
from dataclasses import dataclass
from typing import Optional

import chess
import matplotlib
from chess.pgn import Headers
from PIL import Image

from modules.converter import create_game_from_board
from modules.header import get_headers
from modules.picklable import Picklable
from modules.structures.reviewed_move import ReviewedMove

MAX_EVALUATION = 10.0


@dataclass
class Review(Picklable):
    headers: Headers
    moves: Optional[list[ReviewedMove]] = None

    def add_move(self, move: ReviewedMove):
        assert isinstance(move, ReviewedMove), "expected a ReviewedMove item"
        if self.moves is None:
            self.moves = [move]
        else:
            self.moves.append(move)

    @staticmethod
    def from_json(dictionary: dict):
        headers = get_headers(dictionary["headers"])
        moves = [ReviewedMove.from_json(move) for move in dictionary["moves"]]
        return Review(headers=headers, moves=moves)

    def to_json(self) -> dict:
        return {
            "headers": self.headers.__dict__,
            "moves": [move.to_json() for move in self.moves],
        }

    def to_pgn(self) -> chess.pgn.Game:
        starting_position = self.headers.get("FEN")
        if starting_position is not None:
            board = chess.Board(starting_position)
        else:
            board = chess.Board()

        for index, reviewed_move in enumerate(self.moves):
            board.push_san(reviewed_move.move)

        assert board is not None, "board is empty"
        return create_game_from_board(self.headers, board)

    def get_plot_values(self) -> tuple[list, list]:
        scales = []
        indices = []
        for index, move in enumerate(self.moves):
            if isinstance(move.evaluation.value, int):
                if move.evaluation.value == 0:
                    scale = 1.0 if move.turn else -1.0
                else:
                    scale = 1.0 if move.evaluation.value > 0 else -1.0
            else:
                value = 0.4 * move.evaluation.value
                scale = value / (1 + abs(value))

            scales.append(scale)
            indices.append(1 + index / 2)

        return indices, scales

    def plot_evaluations(self):
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        indices, scales = self.get_plot_values()

        fig = plt.figure(figsize=(len(indices) * 0.2, 2.0), facecolor="#b58863")
        fig.subplots_adjust(left=0, bottom=0, right=1, top=1, wspace=0, hspace=0)
        plt.fill_between(indices, scales, -1, color="#f0d9b5")
        plt.axhline(y=0.0, color="gray", linestyle="-")

        plt.axis("off")
        plt.ylim([-1, 1])
        plt.margins(x=0, y=0)

        bytes_io = io.BytesIO()
        plt.savefig(bytes_io, format="png")
        pil_img = Image.open(bytes_io)
        pil_img = pil_img.rotate(-90, expand=True)

        bytes_io = io.BytesIO()
        pil_img.save(bytes_io, format="png")

        bytes_io.seek(0)
        return base64.b64encode(bytes_io.read()).decode()
