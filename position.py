from dataclasses import dataclass
from typing import Optional

from evaluation import Evaluation
from outcome import Outcome


@dataclass
class Position:
    move: str
    color: bool
    evaluation: Evaluation
    fen: str
    material_balance: int = 0
    outcome: Optional[Outcome] = None

    def __repr__(self):
        return self.move


class PositionOccurred(BaseException):
    pass
