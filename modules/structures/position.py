from dataclasses import dataclass
from typing import Optional

from modules.structures.evaluation import Evaluation
from modules.structures.outcome import Outcome


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

    def to_json(self) -> dict:
        dictionary = {}
        for key, value in self.__dict__.items():
            if isinstance(value, Evaluation):
                dictionary[key] = value.value
            elif isinstance(value, Outcome):
                dictionary[key] = value.__dict__
            else:
                dictionary[key] = value

        return dictionary

    @staticmethod
    def from_json(dictionary: dict):
        for key, value in dictionary.items():
            if key == "evaluation" and value is not None:
                dictionary[key] = Evaluation(value)
            elif key == "outcome" and value is not None:
                dictionary[key] = Outcome(**value)

        return Position(**dictionary)


class PositionOccurred(BaseException):
    pass
