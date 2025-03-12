from enum import IntEnum
from typing import Union


class WinningSideResult(IntEnum):
    LOSS = 0
    DRAW = 1
    IN_PROGRESS = 2
    WIN = 3

    @staticmethod
    def from_string(string: str, turn: bool) -> "WinningSideResult":
        if string == "1-0":
            return WinningSideResult.WIN if turn else WinningSideResult.LOSS
        elif string == "0-1":
            return WinningSideResult.LOSS if turn else WinningSideResult.WIN
        elif string == "1/2-1/2":
            return WinningSideResult.DRAW

        return WinningSideResult.IN_PROGRESS


class LosingOrDrawingSideResult(IntEnum):
    LOSS = 0
    DRAW_OR_IN_PROGRESS = 1
    WIN = 3

    @staticmethod
    def from_string(string: str, turn: bool) -> "LosingOrDrawingSideResult":
        if string == "1-0":
            return LosingOrDrawingSideResult.WIN if turn else LosingOrDrawingSideResult.LOSS
        elif string == "0-1":
            return LosingOrDrawingSideResult.LOSS if turn else LosingOrDrawingSideResult.WIN

        return LosingOrDrawingSideResult.DRAW_OR_IN_PROGRESS


Result = Union[LosingOrDrawingSideResult, WinningSideResult]
