from typing import Dict, Optional

import chess
import chess.gaviota
import numpy as np

from modules.endgame.generator import EndgameGenerator
from modules.structures.move_reply import MoveReply


class EndgameStudy:
    def __init__(
            self,
            endgame_generator: EndgameGenerator,
            beta: float = 2.0
    ):
        self.generator = endgame_generator
        self.tablebase = chess.gaviota.open_tablebase(self.generator.tablebase_path)

        self.board = chess.Board()
        self.starting_position: Optional[str] = None

        self.beta = beta

    def __del__(self):
        self.tablebase.close()

    def draw_position(
            self,
            dtm: int,
            white: bool = True,
            bishop_color: Optional[bool] = None
    ):
        choices = self.generator.find_positions(
            dtm=dtm,
            white=white,
            white_to_move=white,
            result="win",
            bishop_color=bishop_color if self.generator.layout == "KBNvK" else None
        )

        return np.random.choice(choices)

    def start_game(
            self,
            dtm: int,
            white: bool = True,
            bishop_color: Optional[bool] = None
    ) -> str:
        self.starting_position = self.draw_position(dtm, white, bishop_color)
        self.board = chess.Board(self.starting_position)
        return self.starting_position

    def play_move(self, move: chess.Move):
        self.board.push(move)

    def choose_move(self, moves: Dict[chess.Move, int]) -> chess.Move:
        signs = np.sign(list(moves.values()))
        min_sign = min(signs)
        moves = {move: dtm for move, dtm in moves.items() if np.sign(dtm) == min_sign}
        if self.beta == float('inf') or min_sign == 0:
            max_dtm = max(moves.values())
            best_moves = [move for move, dtm in moves.items() if dtm == max_dtm]
            return np.random.choice(best_moves)
        else:
            weights = np.array([abs(dtm) ** self.beta for dtm in moves.values()])
            probabilities = weights / weights.sum()
            return np.random.choice(list(moves.keys()), p=probabilities)

    def prepare_replies(self) -> Dict[chess.Move, int]:
        legal_moves = list(self.board.legal_moves)
        replies = {}

        for move in legal_moves:
            self.board.push(move)
            dtm = self.tablebase.get_dtm(self.board)
            if dtm is not None:
                replies[move] = dtm
            self.board.pop()

        return replies

    def reply(self) -> chess.Move:
        replies = self.prepare_replies()

        if not replies:
            raise ValueError("No legal moves with DTZ found")

        return self.choose_move(replies)

    @staticmethod
    def rate_move(legal_moves: int, previous_dtm: int, current_dtm: int) -> str:
        if legal_moves == 1:
            return "forced"

        difference = previous_dtm + current_dtm
        if previous_dtm != 0:
            if difference == 1 or (difference == 0 and current_dtm != 0):
                return "best"
            elif current_dtm * previous_dtm >= 0:
                return "blunder"
            elif abs(difference) > 8:
                return "mistake"
            elif abs(difference) > 2:
                return "inaccuracy"
        else:
            if abs(current_dtm) > 0:
                return "blunder"

        return ""

    def move(self, fen: str, uci: str) -> MoveReply:
        self.board = chess.Board(fen)
        previous_dtm = self.tablebase.probe_dtm(self.board)
        move = chess.Move.from_uci(uci)
        legal_moves = len(list(self.board.legal_moves))

        self.play_move(move)
        current_dtm = self.tablebase.probe_dtm(self.board)
        previous_rating = self.rate_move(legal_moves, previous_dtm, current_dtm)

        if self.board.is_game_over():
            return MoveReply(
                uci=None,
                san=None,
                fen=self.board.fen(),
                previous_dtm=previous_dtm,
                current_dtm=current_dtm,
                previous_rating=previous_rating
            )

        reply = self.reply()
        san = self.board.san(reply)
        legal_moves = len(list(self.board.legal_moves))
        self.play_move(reply)
        new_dtm = self.tablebase.probe_dtm(self.board)
        current_rating = self.rate_move(legal_moves, current_dtm, new_dtm)

        return MoveReply(
            uci=reply.uci(),
            san=san,
            fen=self.board.fen(),
            previous_dtm=previous_dtm,
            current_dtm=new_dtm,
            previous_rating=previous_rating,
            current_rating=current_rating
        )
