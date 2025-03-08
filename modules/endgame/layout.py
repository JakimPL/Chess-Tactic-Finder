from dataclasses import dataclass
from typing import Dict, List

import chess

PIECES = {
    "P": chess.PAWN,
    "N": chess.KNIGHT,
    "B": chess.BISHOP,
    "R": chess.ROOK,
    "Q": chess.QUEEN,
    "K": chess.KING,
}

LAYOUTS = ["KRvK", "KQvK", "KPvK", "KRRvK", "KBBvK", "KBNvK", "KQvKR", "KQvKN", "KQvKB"]


@dataclass(frozen=True)
class PiecesLayout:
    name: str
    layout: List[List[chess.Piece]]
    pieces: List[chess.Piece]
    colors: Dict[chess.Color, List[chess.Color]]

    @staticmethod
    def get_pieces_layout_from_string(layout: str) -> List[List[chess.Piece]]:
        return [[PIECES[piece] for piece in row] for row in layout.split("v")]

    @staticmethod
    def from_string(name: str) -> "PiecesLayout":
        assert name in LAYOUTS, f"Layout {name} is not supported"
        pieces_layout = PiecesLayout.get_pieces_layout_from_string(name)
        pieces = sum(pieces_layout, [])
        colors = PiecesLayout.generate_colors(pieces_layout)
        return PiecesLayout(name, pieces_layout, pieces, colors)

    @staticmethod
    def generate_colors(
        pieces_layout: List[List[chess.Piece]],
    ) -> Dict[chess.Color, List[chess.Color]]:
        colors_layout = {}
        for color in [chess.WHITE, chess.BLACK]:
            color_layout = [color, not color]

            colors = []
            for i, pieces in enumerate(pieces_layout):
                colors.extend([color_layout[i]] * len(pieces))

            colors_layout[color] = colors

        return colors_layout

    @property
    def count(self) -> int:
        return len(self.pieces)
