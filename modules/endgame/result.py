from enum import Enum


class Outcome(Enum):
    LOSS = "loss"
    DRAW = "draw"
    IN_PROGRESS = "in_progress"
    WIN = "win"

    @staticmethod
    def from_string(string: str, turn: bool) -> "Outcome":
        if string == "1-0":
            return Outcome.WIN if turn else Outcome.LOSS
        elif string == "0-1":
            return Outcome.LOSS if turn else Outcome.WIN
        elif string == "1/2-1/2":
            return Outcome.DRAW

        return Outcome.IN_PROGRESS


class Result:
    def __init__(self, outcome: Outcome):
        self.outcome = outcome

    def __eq__(self, other):
        return self.outcome == other.outcome

    def __repr__(self):
        return f"{self.__class__.__name__}({self.outcome})"


class WinningOrDrawingSideResult(Result):
    preference = ["loss", "draw", "in_progress", "win"]

    def __lt__(self, other: "WinningOrDrawingSideResult"):
        return self.preference.index(self.outcome.value) < self.preference.index(other.outcome.value)


class LosingSideResult(Result):
    preference = ["loss", "in_progress", "draw", "win"]

    def __lt__(self, other: "LosingSideResult"):
        return self.preference.index(self.outcome.value) < self.preference.index(other.outcome.value)
