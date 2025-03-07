from multiprocessing.connection import Client, Listener
from typing import Union

from modules.configuration import load_configuration
from modules.server.client import DummyClient

configuration = load_configuration()
PORT = configuration["server"].get("listener_port", 6000)


def get_client() -> Union[DummyClient, Client]:
    client = DummyClient(display=False)
    try:
        client = Client(("localhost", PORT), authkey=b"tactic")
    except EOFError:
        print("Server is off.")

    return client


def get_listener() -> Listener:
    return Listener(("localhost", PORT), authkey=b"tactic")
