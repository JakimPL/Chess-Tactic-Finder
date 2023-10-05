class DummyClient:
    def __init__(self, display: bool = False):
        self.display = display

    def send(self, message: str):
        if self.display:
            print(message)

    def close(self):
        pass
