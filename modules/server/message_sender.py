from dataclasses import dataclass
from multiprocessing.connection import Client
from typing import Union

from modules.finder.evaluation import Evaluation
from modules.server.client import DummyClient
from modules.server.message import Message


@dataclass
class MessageSender:
    client: Union[DummyClient, Client]
    id: str
    analyzed: int = 0
    total: int = 0

    def __call__(
            self,
            filename: str,
            fen: str,
            move_string: str,
            evaluation: Evaluation
    ):
        text = '{name} Analyzed {items} of {total} games ({percent:.2f}%)...'.format(
            name=self.id,
            items=self.analyzed,
            total=self.total,
            percent=100 * self.analyzed / self.total if self.total > 0 else 100
        )

        message = Message(
            text=text,
            analyzed=self.analyzed,
            total=self.total,
            game_name=filename,
            fen=fen,
            last_move=move_string,
            evaluation=str(evaluation)
        )

        self.client.send(message.encode())
