from pydantic import BaseModel


class Configuration(BaseModel):
    algorithm: dict
    review: dict
    stockfish: dict
    paths: dict
    export: dict
    server: dict
    tactic_player: dict
