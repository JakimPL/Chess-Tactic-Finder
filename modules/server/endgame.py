from typing import Optional

from modules.endgame.generator import EndgameGenerator
from modules.endgame.study import EndgameStudy
from modules.singleton import Singleton


class EndgameStudySingleton(Singleton):
    endgame_generator: Optional[EndgameGenerator] = None
    endgame_study: Optional[EndgameStudy] = None

    def init(self):
        self.endgame_generator = EndgameGenerator()
        self.endgame_study = EndgameStudy(self.endgame_generator)
