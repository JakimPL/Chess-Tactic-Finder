from enum import Enum


class Result(Enum):
    LOSS = "loss"
    DRAW = "draw"
    UNKNOWN = "*"
    WIN = "win"

    @staticmethod
    def from_string(string: str, turn: bool) -> "Result":
        if string == "1-0":
            return Result.WIN if turn else Result.LOSS
        elif string == "0-1":
            return Result.LOSS if turn else Result.WIN
        elif string == "1/2-1/2":
            return Result.DRAW

        return Result.UNKNOWN

    def __lt__(self, other):
        order = ["loss", "draw", "*", "win"]
        return order.index(self.value) < order.index(other.value)
