import random
from typing import Dict, Optional

import chess
import chess.syzygy
import numpy as np

from modules.endgame.generator import EndgameGenerator
from modules.structures.move_reply import MoveReply


class EndgameStudy:
    def __init__(
            self,
            endgame_generator: EndgameGenerator,
            beta: float = float('inf')
    ):
        self.generator = endgame_generator
        self.tablebase = chess.syzygy.open_tablebase(self.generator.tablebase_path)

        self.board = chess.Board()
        self.starting_position: Optional[str] = None

        self.beta = beta

    def __del__(self):
        self.tablebase.close()

    def draw_position(
            self,
            dtz: int,
            white: bool = True,
            bishop_color: Optional[bool] = None
    ):
        bishop_color = bishop_color if bishop_color is not None else bool(random.getrandbits(1))
        choices = self.generator.find_positions(dtz, white, white, result="win", bishop_color=bishop_color)
        return random.choice(choices)

    def start_game(
            self,
            dtz: int,
            white: bool = True,
            bishop_color: Optional[bool] = None
    ) -> str:
        self.starting_position = self.draw_position(dtz, white, bishop_color)
        self.board = chess.Board(self.starting_position)
        return self.starting_position

    def play_move(self, move: chess.Move):
        self.board.push(move)

    def choose_move(self, moves: Dict[chess.Move, int]) -> chess.Move:
        if self.beta == float('inf'):
            max_dtz = max(moves.values())
            best_moves = [move for move, dtz in moves.items() if dtz == max_dtz]
            return np.random.choice(best_moves)
        else:
            weights = np.array([abs(dtz) ** self.beta for dtz in moves.values()])
            probabilities = weights / weights.sum()
            return np.random.choice(list(moves.keys()), p=probabilities)

    def prepare_replies(self) -> Dict[chess.Move, int]:
        legal_moves = list(self.board.legal_moves)
        replies = {}

        for move in legal_moves:
            self.board.push(move)
            dtz = self.tablebase.get_dtz(self.board)
            if dtz is not None:
                replies[move] = dtz
            self.board.pop()

        return replies

    def reply(self) -> chess.Move:
        replies = self.prepare_replies()

        if not replies:
            raise ValueError("No legal moves with DTZ found")

        return self.choose_move(replies)

    @staticmethod
    def rate_move(previous_dtz: int, current_dtz: int) -> str:
        if previous_dtz > 0:
            if current_dtz >= 0:
                return "blunder"
            elif abs(previous_dtz + current_dtz) > 8:
                return "mistake"
            elif abs(previous_dtz + current_dtz) > 2:
                return "inaccuracy"
            elif abs(previous_dtz + current_dtz) == 1:
                return "best"

        return ""

    def move(self, fen: str, uci: str) -> MoveReply:
        self.board = chess.Board(fen)
        previous_dtz = self.tablebase.probe_dtz(self.board)
        move = chess.Move.from_uci(uci)

        self.play_move(move)
        current_dtz = self.tablebase.probe_dtz(self.board)
        rating = self.rate_move(previous_dtz, current_dtz)

        if self.board.is_game_over():
            return MoveReply(
                uci=None,
                san=None,
                fen=self.board.fen(),
                previous_dtz=previous_dtz,
                current_dtz=current_dtz,
                rating=rating
            )

        reply = self.reply()
        san = self.board.san(reply)
        self.play_move(reply)

        return MoveReply(
            uci=reply.uci(),
            san=san,
            fen=self.board.fen(),
            previous_dtz=previous_dtz,
            current_dtz=self.tablebase.probe_dtz(self.board),
            rating=rating
        )
