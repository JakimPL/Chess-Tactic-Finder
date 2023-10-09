from dataclasses import dataclass
from typing import Optional

from chess.pgn import Headers

from modules.reviewer.reviewed_move import ReviewedMove


@dataclass
class Review:
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
