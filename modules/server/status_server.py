from multiprocessing.connection import Listener
from urllib import parse

from modules.server.connection import get_listener
from modules.singleton import Singleton

NO_ANALYSIS_MESSAGE = "No analysis in progress."


class StatusServer(Singleton):
    listener: Listener
    message: str

    def init(self):
        self.listener: Listener = get_listener()
        self.message: str = NO_ANALYSIS_MESSAGE

    def communicate(self):
        while True:
            running = True
            connection = self.listener.accept()
            while running:
                try:
                    self.message = connection.recv()
                    text = parse.parse_qsl(self.message)[0][1]
                    if "completed" in text or "interrupted" in text or "Stockfish error" in text:
                        connection.close()
                        running = False
                except EOFError:
                    running = False
                    self.message = NO_ANALYSIS_MESSAGE
                except KeyboardInterrupt:
                    self.message = NO_ANALYSIS_MESSAGE
                    return

    def close(self):
        self.listener.close()

    def __del__(self):
        self.close()
