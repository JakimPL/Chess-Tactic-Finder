from dataclasses import dataclass

from evaluation import Evaluation


@dataclass
class Move:
    number: int
    white: bool
    move: str
    forced: bool
    only_one_move: bool
    best_played: bool
    evaluation: Evaluation
    move_evaluation: Evaluation
