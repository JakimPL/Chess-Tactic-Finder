import pickle
from dataclasses import dataclass

import chess
import chess.pgn

from position import Position


@dataclass
class Tactic:
    positions: list[Position]
    type: str = ''

    def __iter__(self):
        return self.positions.__iter__()

    def __next__(self):
        return self.positions.__next__()

    def __getitem__(self, item):
        return self.positions.__getitem__(item)

    @staticmethod
    def create_game_from_board(board: chess.Board, headers: dict) -> chess.pgn.Game:
        game = chess.pgn.Game.from_board(board)
        for key, value in headers.items():
            if key != 'FEN':
                game.headers[key] = value

        return game

    def to_pgn(
            self,
            headers: dict,
            ignore_first_move: bool = False,
            save_last_opponent_move: bool = True
    ) -> chess.pgn.Game:
        board = None
        for index, position in enumerate(self.positions):
            if index == 0 and ignore_first_move:
                continue

            if board is None:
                board = chess.Board(position.fen)
                turn = board.turn ^ ignore_first_move

            if position.move:
                if save_last_opponent_move or not (index == len(self.positions) - 1 and board.turn == turn):
                    board.push_san(position.move)

        assert board is not None, "board is empty"
        return self.create_game_from_board(board, headers)

    def to_file(self, path: str):
        with open(path, 'wb') as file:
            pickle.dump(self, file)

    @staticmethod
    def from_file(path: str):
        with open(path, 'rb') as file:
            return pickle.load(file)
