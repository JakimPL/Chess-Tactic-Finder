import json
from copy import deepcopy
from dataclasses import dataclass
from typing import Optional

from anytree import Node, PreOrderIter
from anytree.exporter import JsonExporter
from anytree.importer import JsonImporter
from chess.pgn import Headers

from modules.finder.position import Position
from modules.finder.tactic import Tactic
from modules.header import get_headers
from modules.picklable import Picklable


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
            tactics = sorted(tactics, reverse=True)
            return tactics[0]

    def to_json(self) -> dict:
        exporter = JsonExporter()
        root = deepcopy(self.root)
        for node in PreOrderIter(root):
            if isinstance(node.name, Position):
                node.name = node.name.to_json()

        return {
            'root': json.loads(exporter.export(root)),
            'headers': self.headers.__dict__
        }

    @staticmethod
    def from_json(dictionary: dict):
        importer = JsonImporter()
        root = importer.import_(json.dumps(dictionary['root']))
        for node in PreOrderIter(root):
            if isinstance(node.name, dict):
                node.name = Position.from_json(node.name)

        headers = get_headers(dictionary['headers'])
        return Variations(
            root=root,
            headers=headers
        )
