from dataclasses import dataclass
from typing import Optional

import chess
import chess.pgn
from chess.pgn import Headers

from evaluation import Evaluation
from picklable import Picklable
from position import Position


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

    def create_game_from_board(self, board: chess.Board) -> chess.pgn.Game:
        game = chess.pgn.Game.from_board(board)
        for key, value in self.headers.items():
            if key != 'FEN':
                game.headers[key] = value

        return game

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
        return self.create_game_from_board(board)

    @property
    def fen(self) -> str:
        return self.positions[0].fen

    @property
    def moves(self) -> int:
        return len(self.positions) // 2

    @property
    def initial_evaluation(self) -> Evaluation:
        return self.positions[0].evaluation

    @property
    def starting_evaluation(self) -> Evaluation:
        return self.positions[1].evaluation

    @property
    def final_evaluation(self) -> Evaluation:
        return self.positions[-1].evaluation
