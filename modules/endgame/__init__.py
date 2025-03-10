from modules.configuration import load_configuration

configuration = load_configuration()
TABLEBASE_PATH = configuration["paths"]["tablebase"]
DATABASE_PATH = configuration["paths"]["database"]

ENDGAME_LAYOUTS = {
    "King + 2 Rooks vs King": "KRRvK",
    "King + Queen vs King": "KQvK",
    "King + Rook vs King": "KRvK",
    "King + Pawn vs King": "KPvK",
    "King + Pawn vs King + Pawn": "KPvKP",
    "King + Queen vs King + Bishop": "KQvKB",
    "King + Queen vs King + Knight": "KQvKN",
    "King + Queen vs King + Rook": "KQvKR",
    "King + 2 Bishops vs King": "KBBvK",
    "King + Bishop + Knight vs King": "KBNvK",
}
