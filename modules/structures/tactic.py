from dataclasses import dataclass
from typing import Optional

import chess
import chess.pgn
from chess.pgn import Headers

from modules.converter import create_game_from_board
from modules.picklable import Picklable
from modules.structures.evaluation import Evaluation
from modules.structures.position import Position

TACTIC_TYPES_ORDER = [
    '', 'mating net', 'insufficient material', 'material advantage',
    'repetition', 'checkmate', 'stalemate'
]


@dataclass
class Tactic(Picklable):
    positions: list[Position]
    headers: Optional[Headers] = None
    type: str = ''

    def __iter__(self):
        return self.positions.__iter__()

    def __next__(self):
        return self.positions.__next__()

    def __getitem__(self, item):
        return self.positions.__getitem__(item)

    def __len__(self):
        return self.positions.__len__()

    def __le__(self, other):
        return (
            TACTIC_TYPES_ORDER.index(self.type), self.hardness, self.moves
        ) <= (
            TACTIC_TYPES_ORDER.index(other.type), other.hardness, other.moves
        )

    def __lt__(self, other):
        return (
            TACTIC_TYPES_ORDER.index(self.type), self.hardness, self.moves
        ) < (
            TACTIC_TYPES_ORDER.index(other.type), other.hardness, other.moves
        )

    def to_pgn(
            self,
            ignore_first_move: bool = False,
            save_last_opponent_move: bool = True
    ) -> chess.pgn.Game:
        board = None
        turn = None
        for index, position in enumerate(self.positions):
            if index == 0 and ignore_first_move:
                continue

            if board is None:
                board = chess.Board(position.fen)
                turn = board.turn ^ ignore_first_move

            if position.move:
                if save_last_opponent_move or not (index == len(self.positions) - 1 and board.turn == turn):
                    board.push_san(position.move)

        assert board is not None, "board is empty"
        return create_game_from_board(self.headers, board)

    @property
    def fen(self) -> str:
        return self.positions[0].fen

    @property
    def hard(self) -> bool:
        return all(position.hard for position in self.positions)

    @property
    def hard_moves(self) -> int:
        return sum([position.hard for position in self.positions[0::2]])

    @property
    def moves(self) -> int:
        return len(self.positions) // 2

    @property
    def hardness(self) -> float:
        return self.hard_moves / self.moves if self.moves > 0 else 0.0

    @property
    def initial_evaluation(self) -> Evaluation:
        return self.positions[0].evaluation

    @property
    def starting_evaluation(self) -> Evaluation:
        return self.positions[1].evaluation

    @property
    def final_evaluation(self) -> Evaluation:
        return self.positions[-1].evaluation
