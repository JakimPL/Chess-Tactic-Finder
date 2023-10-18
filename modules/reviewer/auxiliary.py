import math

from modules.structures.evaluation import Evaluation


def win(evaluation: Evaluation, turn: bool) -> float:
    # https://lichess.org/page/accuracy
    if evaluation.mate:
        if evaluation.value == 0:
            return float(turn)

        return 1.0 if evaluation.value > 0 else 0.0
    else:
        return min(1.0, max(0.0, 0.50 + 0.50 * (2 / (1 + math.exp(-0.368208 * evaluation.value)) - 1)))


def get_accuracy(win_difference: float) -> float:
    # https://lichess.org/page/accuracy
    return min(1.0, max(0.0, 1.031668 * math.exp(-4.354 * win_difference) - 0.031668))


def get_win_difference(evaluation: Evaluation, best_evaluation: Evaluation, turn: bool) -> float:
    return win(best_evaluation, turn) - win(evaluation, turn)
