import math
import os
import sqlite3
from itertools import combinations
from pathlib import Path
from typing import List, Dict, Optional, Union

import chess
import chess.syzygy
from tqdm import tqdm

DEFAULT_LAYOUT = [[chess.KING, chess.BISHOP, chess.KNIGHT], [chess.KING]]


class EndgameGenerator:
    def __init__(
            self,
            tablebase_path: Union[str, os.PathLike],
            database_path: Union[str, os.PathLike],
            layout: Optional[List[List[chess.Piece]]] = None,
    ):
        self.tablebase_path = Path(tablebase_path)
        self.tablebase = chess.syzygy.open_tablebase(tablebase_path)

        self.pieces_layout = layout or DEFAULT_LAYOUT
        self.colors_layout = self.generate_colors_layout()

        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(exist_ok=True)
        self.connection = sqlite3.connect(str(database_path), timeout=10.0)
        self.create_table()

    def __del__(self):
        self.close()

    def create_table(self):
        cursor = self.connection.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS positions (
                fen TEXT,
                dtz INTEGER,
                white BOOLEAN,
                white_to_move BOOLEAN,
                bishop_color BOOLEAN,
                PRIMARY KEY (fen)
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_dtz ON positions (dtz)')
        self.connection.commit()

    @staticmethod
    def is_legal_position(board: chess.Board) -> bool:
        white_king = board.king(chess.WHITE)
        black_king = board.king(chess.BLACK)
        if chess.square_distance(white_king, black_king) <= 1:
            return False

        if board.is_check():
            return False

        return True

    @staticmethod
    def get_bishop_color(square: int) -> bool:
        return bool((square + (square >> 3)) & 1)

    def generate_colors_layout(self) -> Dict[chess.Color, List[chess.Color]]:
        colors_layout = {}
        for color in [chess.WHITE, chess.BLACK]:
            color_layout = [color, not color]

            colors = []
            for i, pieces in enumerate(self.pieces_layout):
                colors.extend([color_layout[i]] * len(pieces))

            colors_layout[color] = colors

        return colors_layout

    def generate_positions(self) -> None:
        cursor = self.connection.cursor()
        cursor.execute('DELETE FROM positions')

        pieces = sum(self.pieces_layout, [])
        pieces_count = len(pieces)

        combs = combinations(chess.SQUARES, pieces_count)
        n = math.comb(len(chess.SQUARES), pieces_count)

        for i, squares in tqdm(enumerate(combs), total=n):
            board = chess.Board(None)
            board.clear()

            bishop_color = None
            for white, colors in self.colors_layout.items():
                for square, piece, color in zip(squares, pieces, colors):
                    board.set_piece_at(square, chess.Piece(piece, color))
                    if piece == chess.BISHOP:
                        bishop_color = self.get_bishop_color(square)

                for white_to_move in (chess.WHITE, chess.BLACK):
                    board.turn = white_to_move
                    if not self.is_legal_position(board):
                        continue

                    dtz = self.tablebase.get_dtz(board)
                    if dtz is not None:
                        cursor.execute(
                            'INSERT OR REPLACE INTO positions VALUES (?, ?, ?, ?, ?)',
                            (board.fen(), int(abs(dtz)), white, bool(white_to_move), bishop_color)
                        )

        self.connection.commit()

    def find_positions(
            self,
            dtz: Optional[int] = None,
            white: Optional[bool] = None,
            white_to_move: Optional[bool] = None,
            bishop_color: Optional[bool] = None,
    ):
        cursor = self.connection.cursor()
        query = 'SELECT fen FROM positions WHERE 1=1'
        params = []

        if dtz is not None:
            query += ' AND dtz = ?'
            params.append(dtz)
        if white is not None:
            query += ' AND white = ?'
            params.append(white)
        if white_to_move is not None:
            query += ' AND white_to_move = ?'
            params.append(white_to_move)
        if bishop_color is not None:
            query += ' AND bishop_color = ?'
            params.append(bishop_color)

        cursor.execute(query, params)
        return [row[0] for row in cursor.fetchall()]

    def close(self):
        self.connection.close()
        self.tablebase.close()
