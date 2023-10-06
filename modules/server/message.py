from dataclasses import dataclass
import urllib.parse


@dataclass
class Message:
    text: str
    analyzed: int
    total: int
    game_name: str = ''
    fen: str = ''
    last_move: str = ''
    evaluation: str = ''

    def encode(self) -> str:
        return urllib.parse.urlencode(self.__dict__)
