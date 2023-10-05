from multiprocessing.connection import Listener

from modules.server.connection import get_listener

NO_ANALYSIS_MESSAGE = 'No analysis in progress.'


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
                    self.message = NO_ANALYSIS_MESSAGE
                except KeyboardInterrupt:
                    self.message = NO_ANALYSIS_MESSAGE
                    return

    def close(self):
        self.listener.close()
