from dataclasses import dataclass


@dataclass(frozen=True)
class GameInfo:
    fen: str
    dtm: int
