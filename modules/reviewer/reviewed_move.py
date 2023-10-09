from dataclasses import dataclass

from modules.finder.evaluation import Evaluation
from modules.reviewer.move_classification import MoveClassification


@dataclass
class ReviewedMove:
    move: str
    evaluation: Evaluation
    best_moves: list[tuple[str, Evaluation]]
    move_classification: MoveClassification

    def to_json(self) -> dict:
        return {
            'move': self.move,
            'evaluation': self.evaluation.value,
            'best_moves': [(move, evaluation.value) for move, evaluation in self.best_moves],
            'classification': self.move_classification.__dict__
        }
