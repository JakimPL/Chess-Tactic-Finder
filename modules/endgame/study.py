import logging
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import chess
import chess.gaviota
import numpy as np

from modules.endgame import TABLEBASE_PATH
from modules.endgame.database import EndgameDatabase
from modules.endgame.game_info import GameInfo
from modules.endgame.hint import Hint
from modules.endgame.layout import PiecesLayout
from modules.endgame.result import LosingOrDrawingSideResult, Result, WinningSideResult
from modules.structures.move_reply import MoveReply
from modules.symmetry.transformations import o2

SEED = 137

logger = logging.getLogger("uvicorn.error")


class EndgameStudy:
    def __init__(
        self,
        tablebase_path: Union[str, os.PathLike] = TABLEBASE_PATH,
    ):
        self.database = EndgameDatabase()
        self.tablebase = chess.gaviota.open_tablebase(str(Path(tablebase_path) / "gaviota"))

        self.board = chess.Board()
        self.starting_position: Optional[str] = None

    def __del__(self):
        self.tablebase.close()

    @staticmethod
    def get_bishop_color(square: int) -> bool:
        return bool((square + (square >> 3)) & 1)

    def draw_position(
        self,
        layout: str,
        side_pieces: Optional[str] = None,
        dtm: Optional[int] = None,
        dtz: Optional[int] = None,
    ) -> Tuple[int, ...]:
        side = side_pieces == layout.split("v")[0]
        choices = self.database.find_positions(
            layout=layout,
            side=side,
            dtm=dtm,
            dtz=dtz,
        )

        if not choices:
            raise ValueError("No position matching the criteria")

        choice = np.random.choice(choices)
        return tuple(map(int, choice.split(",")))

    def set_board_from_arrangement(
        self,
        arrangement: Tuple[int, ...],
        layout: str,
        white: Optional[bool] = None,
        bishop_color: Optional[bool] = None,
    ):
        piece_layout = PiecesLayout.from_string(layout)
        transformations = piece_layout.transformation_group

        if white is None:
            white = bool(np.random.choice([True, False]))
        if layout in ("KBNvK", "KQvKB") and bishop_color is not None:
            bishop_square = arrangement[1] if layout == "KBNvK" else arrangement[3]
            preserving = bishop_color == self.get_bishop_color(bishop_square)
            transformations = transformations.preserving_bishop_color(preserving)

        transformation = np.random.choice(transformations.value)
        new_arrangement = tuple(map(transformation, arrangement))

        if not white:
            new_arrangement = tuple(map(o2, new_arrangement))

        self.board.clear()
        for square, piece, color in zip(new_arrangement, piece_layout.pieces, piece_layout.colors):
            self.board.set_piece_at(square, chess.Piece(piece, not (white ^ color)))

        self.starting_position = self.board.fen()

    def start_game(
        self,
        layout: str,
        white: bool = True,
        side_pieces: Optional[str] = None,
        dtm: Optional[int] = None,
        dtz: Optional[int] = None,
        bishop_color: Optional[bool] = None,
    ) -> GameInfo:
        arrangement = self.draw_position(layout, side_pieces, dtm, dtz)
        self.set_board_from_arrangement(arrangement, layout, white, bishop_color)
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
            klass = WinningSideResult if previous_dtm < 0 else LosingOrDrawingSideResult
            result = klass.from_string(self.board.result(), turn)
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
            previous_dtm=-current_dtm,
            current_dtm=new_dtm,
            previous_rating=previous_rating,
            current_rating=current_rating,
        )

    def get_layouts(self) -> List[str]:
        return self.database.get_available_layouts()
