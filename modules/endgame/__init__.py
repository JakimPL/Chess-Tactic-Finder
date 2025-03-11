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
    "KQvKR": {
        "KR": {"min_dtm": 1, "max_dtm": 37, "min_dtz": 1, "max_dtz": 4},
        "KQ": {"min_dtm": 1, "max_dtm": 69, "min_dtz": 1, "max_dtz": 61},
    },
    "KQvKN": {"KQ": {"min_dtm": 1, "max_dtm": 41, "min_dtz": 1, "max_dtz": 37}},
    "KQvKB": {"KQ": {"min_dtm": 1, "max_dtm": 33, "min_dtz": 1, "max_dtz": 23}},
    "KQvK": {"KQ": {"min_dtm": 1, "max_dtm": 19, "min_dtz": 1, "max_dtz": 19}},
    "KRvK": {"KR": {"min_dtm": 1, "max_dtm": 31, "min_dtz": 1, "max_dtz": 31}},
    "KPvK": {"KP": {"min_dtm": 1, "max_dtm": 55, "min_dtz": 1, "max_dtz": 19}},
    "KRRvK": {"KRR": {"min_dtm": 1, "max_dtm": 13, "min_dtz": 1, "max_dtz": 9}},
    "KBBvK": {"KBB": {"min_dtm": 1, "max_dtm": 37, "min_dtz": 1, "max_dtz": 36}},
    "KBNvK": {"KBN": {"min_dtm": 1, "max_dtm": 65, "min_dtz": 1, "max_dtz": 64}},
    "KPvKP": {"KP": {"min_dtm": 1, "max_dtm": 65, "min_dtz": 1, "max_dtz": 21}},
    "KRvKP": {
        "KP": {"min_dtm": 1, "max_dtm": 85, "min_dtz": 1, "max_dtz": 18},
        "KR": {"min_dtm": 1, "max_dtm": 51, "min_dtz": 1, "max_dtz": 25},
    },
}
