from multiprocessing.connection import Listener

from modules.server.connection import get_listener


class StatusServer:
    def __init__(self):
        self.listener: Listener = get_listener()
        self.message: str = 'No analysis in progress.'

    def communicate(self):
        while True:
            running = True
            connection = self.listener.accept()
            while running:
                try:
                    self.message = connection.recv()
                except EOFError:
                    running = False
                except KeyboardInterrupt:
                    return

    def close(self):
        self.listener.close()
