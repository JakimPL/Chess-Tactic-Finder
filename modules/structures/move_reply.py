from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class MoveReply:
    uci: Optional[str]
    san: Optional[str]
    fen: str
    dtz: int
