import chess


def calculate_material_balance(board: chess.Board) -> int:
    white = board.occupied_co[chess.WHITE]
    black = board.occupied_co[chess.BLACK]
    return (
        chess.popcount(white & board.pawns)
        - chess.popcount(black & board.pawns)
        + 3 * (chess.popcount(white & board.knights) - chess.popcount(black & board.knights))
        + 3 * (chess.popcount(white & board.bishops) - chess.popcount(black & board.bishops))
        + 5 * (chess.popcount(white & board.rooks) - chess.popcount(black & board.rooks))
        + 9 * (chess.popcount(white & board.queens) - chess.popcount(black & board.queens))
    )
