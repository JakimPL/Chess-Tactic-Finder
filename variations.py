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

    def get_tactic(self) -> Optional[Tactic]:
        resolved_leaves = self.get_resolved_leaves()
        if resolved_leaves:
            leaf = resolved_leaves[0]
            tactic = Tactic(
                get_node_history(leaf),
                type=leaf.name.outcome.description,
                headers=self.headers
            )

            return tactic

        return None
