from dataclasses import dataclass


@dataclass
class MoveClassification:
    type: str
    mate: bool
    description: str = ''

    @staticmethod
    def from_json(dictionary: dict):
        return MoveClassification(**dictionary)

    def to_json(self) -> dict:
        return self.__dict__
