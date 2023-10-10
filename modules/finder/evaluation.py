class Evaluation:
    def __init__(self, value):
        self.value = value

    def __lt__(self, other):
        self_mate = self.mate
        other_mate = other.mate
        if not self_mate and other_mate:
            return other.value < 0
        elif self_mate and not other_mate:
            return self.value < 0
        elif self_mate and other_mate:
            return 1 / self.value < 1 / other.value
        else:
            return self.value < other.value

    def __neg__(self):
        return Evaluation(-self.value)

    def __eq__(self, other):
        return self.mate == other.mate and self.value == other.value

    def __le__(self, other):
        return self < other or self == other

    def __sub__(self, other):
        assert self.mate == other.mate, "incompatible evaluations"
        if self.mate:
            assert self.value * other.value > 0, "incompatible mate counters"

        return self.value - other.value

    def __repr__(self):
        if self.value == 0.0:
            return " 0.00" if isinstance(self.value, float) else " #0"

        sign = "+" if self.value > 0 else "-"
        if self.mate:
            return "{sign}#{value}".format(sign=sign, value=abs(self.value))
        else:
            return "{sign}{value:.2f}".format(sign=sign, value=abs(self.value))

    @property
    def mate(self):
        return isinstance(self.value, int)

    @staticmethod
    def from_stockfish(move):
        return Evaluation(
            move["Centipawn"] / 100 if move["Centipawn"] is not None else move["Mate"]
        )

    @staticmethod
    def from_evaluation(evaluation):
        return Evaluation(
            evaluation["value"] / 100
            if evaluation["type"] == "cp"
            else evaluation["value"]
        )

    @staticmethod
    def from_string(string: str):
        try:
            return Evaluation(int(string))
        except ValueError:
            return Evaluation(float(string))
