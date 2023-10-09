from dataclasses import dataclass


@dataclass
class MoveClassification:
    type: str
    mate: bool
    description: str = ''
