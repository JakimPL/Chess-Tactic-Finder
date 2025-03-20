import threading
from multiprocessing.connection import Listener
from typing import Optional
from urllib import parse

from modules.server.connection import get_listener
from modules.singleton import Singleton

NO_ANALYSIS_MESSAGE = "No analysis in progress."


class StatusServer(Singleton):
    listener: Listener
    message: str
    _thread: Optional[threading.Thread]
    _running: threading.Event

    def init(self):
        self.listener = get_listener()
        self.message = NO_ANALYSIS_MESSAGE
        self._thread = None
        self._running = threading.Event()

    def communicate(self):
        while self._running.is_set():
            try:
                connection = self.listener.accept()
                if not self._running.is_set():
                    connection.close()
                    break

                while self._running.is_set():
                    try:
                        self.message = connection.recv()
                        text = parse.parse_qsl(self.message)[0][1]
                        if "completed" in text or "interrupted" in text or "Stockfish error" in text:
                            connection.close()
                            break
                    except EOFError:
                        self.message = NO_ANALYSIS_MESSAGE
                        connection.close()
                        break
            except (OSError, ConnectionError, ConnectionAbortedError):
                self.message = NO_ANALYSIS_MESSAGE
                break

    def start(self):
        if self._thread is None:
            self._running.set()
            self._thread = threading.Thread(target=self.communicate, daemon=True)
            self._thread.start()

    def stop(self):
        self._running.clear()
        try:
            self.listener.close()
        except (OSError, ConnectionError, ConnectionAbortedError):
            pass
