from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, FrozenSet, Tuple

import chess

from modules.endgame import ENDGAME_LAYOUTS
from modules.symmetry.transformations import TransformationGroup

PIECES: Dict[str, int] = {
    "P": chess.PAWN,
    "N": chess.KNIGHT,
    "B": chess.BISHOP,
    "R": chess.ROOK,
    "Q": chess.QUEEN,
    "K": chess.KING,
}


@dataclass(frozen=True)
class PiecesLayout:
    name: str
    layout: Tuple[Tuple[int, ...]]
    pieces: Tuple[int, ...]
    colors: Tuple[chess.Color, ...]
    signature: Tuple[int, ...]

    @staticmethod
    def get_pieces_layout_from_string(layout: str) -> Tuple[Tuple[int, ...]]:
        return tuple(tuple(PIECES[piece] for piece in row) for row in layout.split("v"))

    @staticmethod
    def from_string(name: str) -> "PiecesLayout":
        assert name in ENDGAME_LAYOUTS.values(), f"Layout {name} is not supported"
        pieces_layout = PiecesLayout.get_pieces_layout_from_string(name)
        pieces = tuple(map(PIECES.get, name.replace("v", "")))
        colors = PiecesLayout.generate_colors(pieces_layout)
        signature = tuple(piece - 1 + 6 * color for piece, color in zip(pieces, colors))
        return PiecesLayout(name, pieces_layout, pieces, colors, signature)

    @staticmethod
    def generate_colors(pieces_layout: Tuple[Tuple[int]]) -> Tuple[chess.Color, ...]:
        assert len(pieces_layout) == 2, "Expected only two groups"
        return tuple(([chess.WHITE] * len(pieces_layout[0])) + ([chess.BLACK] * len(pieces_layout[1])))

    def arrange(self, squares: Tuple[int, ...]) -> Tuple[FrozenSet[int], ...]:
        assert len(squares) == len(self.signature), "Invalid number of squares"
        items = defaultdict(list)
        for square, signature in zip(squares, self.signature):
            items[signature].append(square)

        return tuple(map(frozenset, items.values()))

    @property
    def count(self) -> int:
        return len(self.pieces)

    @property
    def transformation_group(self) -> TransformationGroup:
        return TransformationGroup.Z2 if "P" in self.name else TransformationGroup.D4

    @property
    def symmetric(self) -> bool:
        return self.name.split("v")[0] == self.name.split("v")[1]
