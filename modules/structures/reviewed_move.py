from dataclasses import dataclass

from modules.structures.evaluation import Evaluation
from modules.structures.move_classification import MoveClassification


@dataclass
class ReviewedMove:
    move: str
    turn: bool
    evaluation: Evaluation
    best_moves: list[tuple[str, Evaluation]]
    move_classification: MoveClassification

    @staticmethod
    def from_json(dictionary: dict):
        return ReviewedMove(
            move=dictionary['move'],
            turn=dictionary['turn'],
            evaluation=Evaluation.from_string(dictionary['evaluation']),
            best_moves=[
                (move, Evaluation.from_string(evaluation))
                for move, evaluation in dictionary['best_moves']
            ],
            move_classification=MoveClassification.from_json(dictionary['classification'])
        )

    def to_json(self) -> dict:
        return {
            'move': self.move,
            'turn': self.turn,
            'evaluation': str(self.evaluation.value),
            'best_moves': [(move, str(evaluation.value)) for move, evaluation in self.best_moves],
            'classification': self.move_classification.__dict__
        }
