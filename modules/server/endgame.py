from typing import Optional

from modules.endgame.study import EndgameStudy
from modules.singleton import Singleton


class EndgameStudySingleton(Singleton):
    endgame_study: Optional[EndgameStudy] = None

    def init(self):
        self.endgame_study = EndgameStudy()
