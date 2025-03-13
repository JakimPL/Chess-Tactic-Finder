import threading
from concurrent.futures import ThreadPoolExecutor
from multiprocessing.connection import Listener
from urllib import parse

from modules.server.connection import get_listener
from modules.singleton import Singleton

NO_ANALYSIS_MESSAGE = "No analysis in progress."


class StatusServer(Singleton):
    listener: Listener
    message: str
    _executor: ThreadPoolExecutor
    _running: threading.Event

    def init(self):
        self.listener = get_listener()
        self.message = NO_ANALYSIS_MESSAGE
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._running = threading.Event()

    def communicate(self):
        self._running.set()
        while self._running.is_set():
            connection = self.listener.accept()
            while self._running.is_set():
                try:
                    self.message = connection.recv()
                    text = parse.parse_qsl(self.message)[0][1]
                    if "completed" in text or "interrupted" in text or "Stockfish error" in text:
                        connection.close()
                        break
                except EOFError:
                    self.message = NO_ANALYSIS_MESSAGE
                    break
                except KeyboardInterrupt:
                    self.stop()
                    return

    def start(self):
        self._executor.submit(self.communicate)

    def stop(self):
        self._running.clear()
        self.listener.close()
        self._executor.shutdown(wait=False)

    def __del__(self):
        self.stop()
