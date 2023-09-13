from dataclasses import dataclass
from typing import Optional

from anytree import Node
from chess.pgn import Headers

from picklable import Picklable
from position import Position
from tactic import Tactic


def get_node_history(node: Node) -> list[Position]:
    history = [node.name for node in node.ancestors] + [node.name]
    return history


@dataclass
class Variations(Picklable):
    root: Node
    headers: Optional[Headers] = None

    def get_resolved_leaves(self) -> list[Node]:
        leaves = self.root.leaves
        return sorted([
            leaf for leaf in leaves
            if leaf.name.outcome.type != 'not resolved'
        ], key=lambda leaf: leaf.depth, reverse=True)

    def get_tactics(self) -> Optional[list[Tactic]]:
        resolved_leaves = self.get_resolved_leaves()
        if resolved_leaves:
            return [
                Tactic(
                    get_node_history(leaf),
                    type=leaf.name.outcome.description,
                    headers=self.headers
                ) for leaf in resolved_leaves
            ]

    def get_tactic(self) -> Optional[Tactic]:
        tactics = self.get_tactics()
        if tactics:
            tactics = sorted([
                (tactic.hard_moves, tactic.moves, tactic)
                for tactic in tactics
            ], key=lambda pair: (pair[0], pair[1]), reverse=True)

            return tactics[0][2]
