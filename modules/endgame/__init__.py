from modules.configuration import load_configuration

configuration = load_configuration()
TEMP_PATH = configuration["paths"]["temp_endgame"]
TABLEBASE_PATH = configuration["paths"]["tablebase"]

ENDGAME_LAYOUTS = {
    "King + Queen vs King": "KQvK",
    "King + Rook vs King": "KRvK",
    "King + Pawn vs King": "KPvK",
    "King + Queen vs King + Pawn": "KQvKP",
    "King + Rook vs King + Pawn": "KRvKP",
    "King + Pawn vs King + Pawn": "KPvKP",
    "King + Queen vs King + Bishop": "KQvKB",
    "King + Queen vs King + Knight": "KQvKN",
    "King + Queen vs King + Rook": "KQvKR",
    "King + 2 Rooks vs King": "KRRvK",
    "King + 2 Bishops vs King": "KBBvK",
    "King + Bishop + Knight vs King": "KBNvK",
}

WINNING_SIDES_RANGES = {
    "KQvKR": {
        "KQ": {"min_dtm": 1, "max_dtm": 69, "min_dtz": 1, "max_dtz": 61},
        "KR": {"min_dtm": 1, "max_dtm": 37, "min_dtz": 1, "max_dtz": 4},
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
        "KR": {"min_dtm": 1, "max_dtm": 51, "min_dtz": 1, "max_dtz": 25},
        "KP": {"min_dtm": 1, "max_dtm": 85, "min_dtz": 1, "max_dtz": 18},
    },
    "KQvKP": {
        "KQ": {"min_dtm": 1, "max_dtm": 55, "min_dtz": 1, "max_dtz": 51},
        "KP": {"min_dtm": 1, "max_dtm": 57, "min_dtz": 1, "max_dtz": 1},
    },
}
