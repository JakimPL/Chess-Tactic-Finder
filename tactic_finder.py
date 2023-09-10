from typing import Optional

import chess
from anytree import Node
from stockfish import Stockfish

from analysis import calculate_material_balance
from evaluation import Evaluation
from position import PositionOccurred, Position
from outcome import Outcome
from tactic import Tactic

CENTIPAWN_THRESHOLD = 2.50
CENTIPAWN_LIMIT = 10.00
CENTIPAWN_TOLERANCE = 0.4
CHECKMATE_PROGRESS_THRESHOLD = 0.5
REPETITION_THRESHOLD = 2

MIN_RELATIVE_MATERIAL_BALANCE = 3
HARD_EVALUATION = False

STOCKFISH_TOP_MOVES = 5


class TacticFinder:
    def __init__(
            self,
            stockfish: Stockfish,
            white: bool,
            starting_position: Position,
            centipawn_threshold: float = CENTIPAWN_THRESHOLD,
            centipawn_limit: float = CENTIPAWN_LIMIT,
            centipawn_tolerance: float = CENTIPAWN_TOLERANCE,
            checkmate_progress_threshold: float = CHECKMATE_PROGRESS_THRESHOLD,
            repetition_threshold: int = REPETITION_THRESHOLD,
            stockfish_top_moves: int = STOCKFISH_TOP_MOVES,
            hard_evaluation: bool = HARD_EVALUATION,
            fens: set[str] = None
    ):
        self.stockfish: Stockfish = stockfish
        self.fens: set[str] = set() if fens is None else fens
        self.white: bool = white
        self.visited_fens: set[str] = set()

        starting_fen: str = starting_position.fen
        self.starting_position: Position = starting_position
        self.material_balance: int = calculate_material_balance(chess.Board(starting_fen))
        self.checkmate_counter: Optional[int] = None

        self.centipawn_threshold: float = centipawn_threshold
        self.centipawn_limit: float = centipawn_limit
        self.centipawn_tolerance: float = centipawn_tolerance
        self.checkmate_progress_threshold: float = checkmate_progress_threshold
        self.repetition_threshold: int = repetition_threshold
        self.stockfish_top_moves: int = stockfish_top_moves
        self.hard_evaluation: bool = hard_evaluation

    def is_only_one_good_move(self, best_moves: list[dict] = None) -> bool:
        best_moves = self.stockfish.get_top_moves(self.stockfish_top_moves) if best_moves is None else best_moves
        evaluations = [Evaluation.from_stockfish(move) for move in best_moves]
        if len(best_moves) == 0:
            return False
        elif len(best_moves) == 1:
            evaluation = evaluations[0] if self.white else -evaluations[0]
            return evaluation.value > 0
        elif len(best_moves) >= 2:
            evaluation = evaluations[0] if self.white else -evaluations[0]
            next_evaluation = evaluations[1] if self.white else -evaluations[1]
            if evaluation.mate and next_evaluation.mate:
                if self.hard_evaluation:
                    return evaluation.value > 0 > next_evaluation.value
                else:
                    return evaluation.value > 0 and evaluation > next_evaluation
            elif evaluation.mate and not next_evaluation.mate:
                return evaluation.value > 0
            elif not evaluation.mate and next_evaluation.mate:
                return evaluation.value >= 0.0
            elif not evaluation.mate and not next_evaluation.mate:
                return (
                        evaluation.value - next_evaluation.value > self.centipawn_threshold
                        and 0 <= evaluation.value <= self.centipawn_limit
                )
        else:
            raise ValueError("unexpected number of moves")

    def get_good_enough_moves(self, best_moves: list[dict] = None) -> list[str]:
        if len(best_moves) == 0:
            return []
        elif len(best_moves) == 1:
            return [best_moves[0]['Move']]
        elif len(best_moves) >= 2:
            evaluations = {
                move['Move']: (
                    Evaluation.from_stockfish(move)
                    if self.white else -Evaluation.from_stockfish(move)
                )
                for move in best_moves
            }

            best_evaluation = next(iter(evaluations.values()))
            if best_evaluation.mate:
                if best_evaluation.value > 0 or best_evaluation.value < 0:
                    return [
                        move for move, evaluation in evaluations.items()
                        if evaluation.mate and evaluation == best_evaluation
                    ]
                else:
                    raise ValueError("mate counter cannot be zero")
            else:
                return [
                    move for move, evaluation in evaluations.items()
                    if not evaluation.mate and abs(best_evaluation - evaluation) < self.centipawn_tolerance
                ]

    @staticmethod
    def get_node_history(node: Node) -> list[Position]:
        history = [node.name for node in node.ancestors] + [node.name]
        return history

    def get_board_from_history(self, node: Optional[Node]) -> chess.Board:
        board = chess.Board(self.starting_position.fen)
        if node is None:
            return board
        else:
            history = self.get_node_history(node)

        for position in history:
            if position.move:
                board.push_san(position.move)

        return board

    @staticmethod
    def get_resolved_leaves(leaves: list[Node]) -> list[Node]:
        return sorted([
            leaf for leaf in leaves
            if leaf.name.outcome.type != 'not resolved'
        ], key=lambda leaf: leaf.depth, reverse=True)

    def create_tree(self) -> Optional[Node]:
        try:
            root = self.find().root
            root.name = self.starting_position
        except PositionOccurred:
            return None
        except ValueError as error:
            print(f'Stockfish error: {error}')
            return None

        return root

    def find(
            self,
            move: str = None,
            previous_fen: str = '',
            defender: bool = False,
            parent: Node = None
    ) -> Node:
        fen = self.stockfish.get_fen_position()
        self.visited_fens.add(fen)
        if fen in self.fens:
            raise PositionOccurred("position already occurred")

        best_moves = self.stockfish.get_top_moves(self.stockfish_top_moves)
        material_balance = self.get_relative_material_balance(fen)
        color = self.white ^ defender

        evaluation = None
        if best_moves:
            evaluation = Evaluation.from_stockfish(best_moves[0])
            if not defender and evaluation.mate:
                self.checkmate_counter = evaluation.value

        if move is None:
            position = self.starting_position
        else:
            position = Position(
                move=move,
                color=color,
                evaluation=evaluation,
                fen=previous_fen,
                material_balance=material_balance
            )

        node = Node(position, parent=parent)
        board = self.get_board_from_history(node)
        outcome = self.get_outcome(board, evaluation, material_balance)
        node.name.outcome = outcome

        if outcome.type == 'draw':
            node.name.evaluation = Evaluation(0.0)
        else:
            if defender:
                good_enough_responses = self.get_good_enough_moves(best_moves)
                new_fen = self.stockfish.get_fen_position()
                for response in good_enough_responses:
                    self.stockfish.set_fen_position(new_fen)
                    self.stockfish.make_moves_from_current_position([response])
                    self.find(response, fen, False, parent=node)

            else:
                if self.is_only_one_good_move(best_moves):
                    best_move = best_moves[0]['Move']
                    self.stockfish.make_moves_from_current_position([best_move])
                    self.find(best_move, fen, True, parent=node)

            self.stockfish.set_fen_position(fen)

        return node

    def get_relative_material_balance(self, fen: str) -> int:
        board = chess.Board(fen)
        material_balance = calculate_material_balance(board)
        coefficient = 1 if self.white else -1
        return coefficient * (material_balance - self.material_balance)

    def get_outcome(
            self,
            board: chess.Board,
            evaluation: Evaluation,
            material_balance: int
    ) -> Outcome:
        if board.is_stalemate():
            return Outcome('draw', 'stalemate')
        elif board.is_insufficient_material():
            return Outcome('draw', 'insufficient material')
        elif board.is_repetition(self.repetition_threshold) or board.can_claim_draw():
            return Outcome('draw', 'repetition')

        if self.checkmate_counter:
            if board.is_game_over():
                return Outcome('checkmate', 'checkmate')
            elif evaluation is not None and evaluation.mate:
                if evaluation.value - 1 < self.checkmate_counter * self.checkmate_progress_threshold:
                    return Outcome('checkmate', 'mating net')

        material_advantage = material_balance >= MIN_RELATIVE_MATERIAL_BALANCE
        if material_advantage:
            return Outcome('material advantage', 'material advantage')

        return Outcome('not resolved')

    def find_tactic(self) -> Optional[Tactic]:
        root = self.create_tree()
        if root and root.children:
            leaves = root.leaves
            resolved_leaves = self.get_resolved_leaves(leaves)
            if resolved_leaves:
                leaf = resolved_leaves[0]
                tactic = Tactic(
                    self.get_node_history(leaf),
                    type=leaf.name.outcome.description
                )

                return tactic

        return None
