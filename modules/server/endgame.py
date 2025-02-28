from typing import Optional

from modules.endgame.generator import EndgameGenerator
from modules.endgame.study import EndgameStudy


class EndgameStudySingleton:
    _instance = None
    endgame_generator: Optional[EndgameGenerator] = None
    endgame_study: Optional[EndgameStudy] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(EndgameStudySingleton, cls).__new__(cls)
            cls._instance.init()
        return cls._instance

    def init(self):
        self.endgame_generator = EndgameGenerator()
        self.endgame_study = EndgameStudy(self.endgame_generator)

    def get_instance(self):
        return self.endgame_study
