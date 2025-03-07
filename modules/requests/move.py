from pydantic import BaseModel


class MoveData(BaseModel):
    fen: str
    move: str
    beta: float
