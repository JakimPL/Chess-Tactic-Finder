from dataclasses import dataclass
from typing import Optional


@dataclass
class Record:
    fen: str
    dtz: int
    white: bool
    white_to_move: bool
    result: str
    bishop_color: Optional[bool] = None
