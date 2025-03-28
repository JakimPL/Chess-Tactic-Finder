from dataclasses import dataclass
from multiprocessing.connection import Client
from typing import Union

from modules.server.client import DummyClient
from modules.structures.evaluation import Evaluation
from modules.structures.message import Message


@dataclass
class MessageSender:
    client: Union[DummyClient, Client]
    id: str
    text: str
    analyzed: int = 0
    total: int = 0

    def __call__(self, filename: str, fen: str, move_string: str, turn: bool, evaluation: Evaluation):
        text = "{name} {text} {items} of {total} games ({percent:.2f}%)...".format(
            name=self.id,
            text=self.text,
            items=self.analyzed,
            total=self.total,
            percent=100 * self.analyzed / self.total if self.total > 0 else 100,
        )

        message = Message(
            text=text,
            analyzed=self.analyzed,
            total=self.total,
            game_name=filename,
            fen=fen,
            last_move=move_string,
            turn=turn,
            evaluation=str(evaluation),
        )

        self.client.send(message.encode())
