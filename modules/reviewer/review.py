from dataclasses import dataclass
from typing import Optional

import chess
from chess.pgn import Headers

from modules.converter import create_game_from_board
from modules.picklable import Picklable
from modules.reviewer.reviewed_move import ReviewedMove


@dataclass
class Review(Picklable):
    headers: Headers
    moves: Optional[list[ReviewedMove]] = None

    def add_move(self, move: ReviewedMove):
        assert isinstance(move, ReviewedMove), 'expected a ReviewedMove item'
        if self.moves is None:
            self.moves = [move]
        else:
            self.moves.append(move)

    def to_json(self) -> dict:
        return {
            'headers': self.headers.__dict__,
            'moves': [move.to_json() for move in self.moves]
        }

    def to_pgn(self) -> chess.pgn.Game:
        starting_position = self.headers.get('FEN')
        if starting_position is not None:
            board = chess.Board(starting_position)
        else:
            board = chess.Board()

        for index, reviewed_move in enumerate(self.moves):
            board.push_san(reviewed_move.move)

        assert board is not None, "board is empty"
        return create_game_from_board(self.headers, board)
