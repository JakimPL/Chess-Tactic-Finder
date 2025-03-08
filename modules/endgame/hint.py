from dataclasses import dataclass


@dataclass(frozen=True)
class Hint:
    piece: str
    uci: str
