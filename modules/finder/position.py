from dataclasses import dataclass
from typing import Optional

from modules.finder.evaluation import Evaluation
from modules.finder.outcome import Outcome


@dataclass
class Position:
    move: str
    color: bool
    evaluation: Evaluation
    fen: str
    forced: bool = False
    hard: bool = True
    material_balance: int = 0
    outcome: Optional[Outcome] = None

    def __repr__(self):
        return self.move


class PositionOccurred(BaseException):
    pass
