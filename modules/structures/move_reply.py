from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class MoveReply:
    uci: Optional[str]
    san: Optional[str]
    fen: str
    previous_dtm: int
    current_dtm: int
    previous_rating: str = ""
    current_rating: str = ""
