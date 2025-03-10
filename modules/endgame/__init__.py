from modules.configuration import load_configuration

configuration = load_configuration()
TABLEBASE_PATH = configuration["paths"]["tablebase"]
DATABASE_PATH = configuration["paths"]["database"]

ENDGAME_LAYOUTS = {
    "King + 2 Rooks vs King": "KRRvK",
    "King + Queen vs King": "KQvK",
    "King + Rook vs King": "KRvK",
    "King + Pawn vs King": "KPvK",
    "King + Queen vs King + Pawn": "KQvKP",
    "King + Rook vs King + Pawn": "KRvKP",
    "King + Pawn vs King + Pawn": "KPvKP",
    "King + Queen vs King + Bishop": "KQvKB",
    "King + Queen vs King + Knight": "KQvKN",
    "King + Queen vs King + Rook": "KQvKR",
    "King + 2 Bishops vs King": "KBBvK",
    "King + Bishop + Knight vs King": "KBNvK",
}

WINNING_SIDES_RANGES = {
    "KRRvK": {
        "KRR": {"min": 1, "max": 7},
    },
    "KQvK": {
        "KQ": {"min": 1, "max": 16},
    },
    "KRvK": {
        "KR": {"min": 1, "max": 16},
    },
    "KPvK": {
        "KP": {"min": 1, "max": 28},
    },
    "KQvKP": {
        "KQ": {"min": 1, "max": 16},
        "KP": {"min": 1, "max": 28},
    },
    "KRvKP": {
        "KR": {"min": 1, "max": 16},
        "KP": {"min": 1, "max": 28},
    },
    "KPvKP": {
        "KP": {"min": 1, "max": 32},
    },
    "KQvKB": {
        "KQ": {"min": 1, "max": 16},
    },
    "KQvKN": {
        "KQ": {"min": 1, "max": 16},
    },
    "KQvKR": {
        "KQ": {"min": 1, "max": 35},
        "KR": {"min": 1, "max": 18},
    },
    "KBBvK": {
        "KBB": {"min": 1, "max": 19},
    },
    "KBNvK": {
        "KBN": {"min": 1, "max": 33},
    },
}
