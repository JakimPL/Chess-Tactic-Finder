import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import chess
import chess.gaviota
import numpy as np

from modules.endgame import DATABASE_PATH, TABLEBASE_PATH
from modules.endgame.database import EndgameDatabase
from modules.endgame.game_info import GameInfo
from modules.endgame.hint import Hint
from modules.endgame.result import (
    LosingSideResult,
    Outcome,
    Result,
    WinningOrDrawingSideResult,
)
from modules.structures.move_reply import MoveReply

SEED = 137


class EndgameStudy:
    def __init__(
        self,
        tablebase_path: Union[str, os.PathLike] = TABLEBASE_PATH,
        database_path: Union[str, os.PathLike] = DATABASE_PATH,
    ):
        self.database = EndgameDatabase(database_path)
        self.tablebase = chess.gaviota.open_tablebase(str(Path(tablebase_path) / "gaviota"))

        self.board = chess.Board()
        self.starting_position: Optional[str] = None

    def __del__(self):
        self.tablebase.close()

    def draw_position(
        self,
        layout: str,
        dtm: Optional[int] = None,
        dtz: Optional[int] = None,
        white: bool = True,
        bishop_color: Optional[bool] = None,
        side_pieces: Optional[str] = None,
    ):
        if white is None:
            white = bool(np.random.choice([True, False]))

        choices = self.database.find_positions(
            layout=layout,
            dtm=dtm,
            dtz=dtz,
            white_to_move=white,
            result="win",
            bishop_color=bishop_color if layout == "KBNvK" else None,
            white_pieces=side_pieces if white else None,
            black_pieces=side_pieces if not white else None,
        )

        if not choices:
            raise ValueError("No position matching the criteria")

        return np.random.choice(choices)

    def start_game(
        self,
        layout: str,
        dtm: Optional[int] = None,
        dtz: Optional[int] = None,
        white: bool = True,
        bishop_color: Optional[bool] = None,
        side_pieces: Optional[str] = None,
    ) -> GameInfo:
        self.starting_position = self.draw_position(layout, dtm, dtz, white, bishop_color, side_pieces)
        self.board = chess.Board(self.starting_position)
        dtm = self.tablebase.probe_dtm(self.board)
        return GameInfo(fen=self.starting_position, dtm=dtm)

    def play_move(self, move: chess.Move):
        self.board.push(move)

    @staticmethod
    def choose_move(
        moves: Dict[chess.Move, Tuple[int, Tuple[Result, int]]], beta: float, seed: Optional[int] = None
    ) -> chess.Move:
        if seed is not None:
            np.random.seed(seed)

        best_class = max(outcome for _, outcome in moves.values())
        moves = {move: dtm for move, (dtm, outcome) in moves.items() if outcome == best_class}
        if beta == float("inf") or best_class[1] == 0:
            max_dtm = max(moves.values())
            best_moves = [move for move, dtm in moves.items() if dtm == max_dtm]
            return np.random.choice(best_moves)
        else:
            dtms = np.abs(np.array(list(moves.values())))
            weights = (1 / dtms) ** beta if best_class[1] > 0 else dtms**beta
            probabilities = weights / weights.sum()
            return np.random.choice(list(moves.keys()), p=probabilities)

    def prepare_replies(self, previous_dtm: int) -> Dict[chess.Move, Tuple[int, Tuple[Result, int]]]:
        legal_moves = list(self.board.legal_moves)
        replies = {}

        for move in legal_moves:
            turn = self.board.turn
            self.board.push(move)
            dtm = self.tablebase.get_dtm(self.board)
            klass = WinningOrDrawingSideResult if previous_dtm >= 0 else LosingSideResult
            result = klass(Outcome.from_string(self.board.result(), turn))
            if dtm is not None:
                replies[move] = dtm, (result, -np.sign(dtm))
            self.board.pop()

        return replies

    def reply(self, previous_dtm: int, beta: float, seed: Optional[int] = None) -> chess.Move:
        replies = self.prepare_replies(previous_dtm)

        if not replies:
            raise ValueError("No legal moves with DTZ found")

        return self.choose_move(replies, beta, seed)

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

    def get_best_move(self, fen: str) -> Hint:
        self.board = chess.Board(fen)
        previous_dtm = self.tablebase.probe_dtm(self.board)
        replies = self.prepare_replies(previous_dtm)
        move = self.choose_move(replies, float("inf"), SEED)
        uci = move.uci()
        return Hint(
            piece=self.board.piece_at(move.from_square).symbol(),
            uci=uci,
        )

    def move(self, fen: str, uci: str, beta: float) -> MoveReply:
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
                previous_rating=previous_rating,
            )

        reply = self.reply(previous_dtm, beta)
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
            current_rating=current_rating,
        )

    def get_layouts(self) -> List[str]:
        return self.database.get_available_layouts()
