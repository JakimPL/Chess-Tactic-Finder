from dataclasses import dataclass


@dataclass
class Outcome:
    type: str
    description: str = ""
