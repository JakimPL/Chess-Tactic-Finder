import os
import pickle
import sqlite3

from concurrent.futures import ProcessPoolExecutor, as_completed
from itertools import permutations
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Union

import chess
import chess.syzygy
from tqdm import tqdm

from modules.configuration import load_configuration
from modules.endgame.record import Record

configuration = load_configuration()
TABLEBASE_PATH = configuration['paths']['tablebase']
DATABASE_PATH = configuration['paths']['database']
DEFAULT_LAYOUT = [[chess.KING, chess.BISHOP, chess.KNIGHT], [chess.KING]]


class EndgameGenerator:
    def __init__(
            self,
            tablebase_path: Union[str, os.PathLike] = TABLEBASE_PATH,
            database_path: Union[str, os.PathLike] = DATABASE_PATH,
            layout: Optional[List[List[chess.Piece]]] = None,
    ):
        self.tablebase_path = Path(tablebase_path)
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(exist_ok=True)

        self.pieces_layout = layout or DEFAULT_LAYOUT
        self.colors_layout = self.generate_colors_layout()

        self.create_table()

    def create_table(self):
        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS positions (
                fen TEXT,
                dtz INTEGER,
                white BOOLEAN,
                white_to_move BOOLEAN,
                result TEXT,
                bishop_color BOOLEAN,
                PRIMARY KEY (fen)
            )
        ''')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_fen ON positions (fen)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_dtz ON positions (dtz)')
        connection.commit()

        cursor.execute('SELECT COUNT(*) FROM positions')
        items = cursor.fetchone()[0]
        connection.close()

        if not items:
            self.generate_positions()

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

    @staticmethod
    def set_board(board: chess.Board, pieces: List[chess.Piece], squares: Tuple[int], colors: List[bool]) -> Optional[bool]:
        bishop_color = None
        for square, piece, color in zip(squares, pieces, colors):
            board.set_piece_at(square, chess.Piece(piece, color))
            if piece == chess.BISHOP:
                bishop_color = EndgameGenerator.get_bishop_color(square)

        return bishop_color

    def generate_colors_layout(self) -> Dict[chess.Color, List[chess.Color]]:
        colors_layout = {}
        for color in [chess.WHITE, chess.BLACK]:
            color_layout = [color, not color]

            colors = []
            for i, pieces in enumerate(self.pieces_layout):
                colors.extend([color_layout[i]] * len(pieces))

            colors_layout[color] = colors

        return colors_layout

    def generate_positions(self, batch_size: int = 4096, max_workers: int = 8) -> None:
        pieces = sum(self.pieces_layout, [])
        pieces_count = len(pieces)

        perms = list(permutations(chess.SQUARES, pieces_count))
        batches = self.batch(perms, batch_size)

        partial_results_path = self.database_path.with_name(self.database_path.stem)
        partial_results_path.mkdir(exist_ok=True)

        processed_batches = self.get_processed_batches(partial_results_path)
        self.execute_batches(batches, pieces, processed_batches, partial_results_path, max_workers)
        self.save_items_to_database(partial_results_path)

    @staticmethod
    def get_processed_batches(partial_results_path: Path) -> List[int]:
        processed_batches = []
        for pkl_file in partial_results_path.glob("*.pkl"):
            batch_index = int(pkl_file.stem)
            processed_batches.append(batch_index)
        return processed_batches

    @staticmethod
    def batch(iterable, n=1):
        length = len(iterable)
        for ndx in range(0, length, n):
            yield iterable[ndx:min(ndx + n, length)]

    def execute_batches(self, batches, pieces, processed_batches, partial_results_path, max_workers):
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            batch_indices = []
            for i, batch in enumerate(batches):
                if i not in processed_batches:
                    batch_indices.append(i)
                    futures.append(executor.submit(self.process_batch, batch, pieces, self.colors_layout, self.tablebase_path))

            for i, future in tqdm(zip(batch_indices, as_completed(futures)), total=len(futures)):
                partial_result = future.result()
                partial_results_file = partial_results_path / f"{i:04d}.pkl"
                self.save_partial_results(partial_results_file, partial_result)

    @staticmethod
    def process_batch(batch, pieces, colors_layout, tablebase_path: Union[str, os.PathLike] = TABLEBASE_PATH):
        results = []
        tablebase = chess.syzygy.open_tablebase(tablebase_path)

        for squares in batch:
            for white, colors in colors_layout.items():
                board = chess.Board(None)
                board.clear()
                bishop_color = EndgameGenerator.set_board(board, pieces, squares, colors)

                for white_to_move in (chess.WHITE, chess.BLACK):
                    board.turn = white_to_move
                    if not EndgameGenerator.is_legal_position(board):
                        continue

                    try:
                        dtz = tablebase.probe_dtz(board)
                        result = 'win' if dtz > 0 else 'loss' if dtz < 0 else 'draw'
                        results.append((board.fen(), int(dtz), white, bool(white_to_move), result, bishop_color))
                    except KeyError:
                        pass

        tablebase.close()
        return results

    def get_connection(self) -> sqlite3.Connection:
        return sqlite3.connect(str(self.database_path), timeout=10.0)

    @staticmethod
    def save_partial_results(path: Union[str, os.PathLike], items: List[Tuple]) -> None:
        with open(path, 'wb') as file:
            pickle.dump(items, file)

    @staticmethod
    def load_partial_results(path: Union[str, os.PathLike]) -> List[Tuple]:
        with open(path, 'rb') as file:
            return pickle.load(file)

    def save_batch_to_database(self, batch: List[Tuple]) -> None:
        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute('BEGIN TRANSACTION')
        cursor.executemany('INSERT INTO positions VALUES (?, ?, ?, ?, ?, ?)', batch)
        connection.commit()
        connection.close()

    def save_items_to_database(self, partial_results_path: Path) -> None:
        for pkl_file in sorted(partial_results_path.glob("*.pkl")):
            batch = self.load_partial_results(pkl_file)
            self.save_batch_to_database(batch)

    def find_positions(
            self,
            dtz: Optional[int] = None,
            white: Optional[bool] = None,
            white_to_move: Optional[bool] = None,
            result: Optional[str] = None,
            bishop_color: Optional[bool] = None,
    ):
        connection = self.get_connection()
        cursor = connection.cursor()
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
        if result is not None:
            query += ' AND result = ?'
            params.append(result)
        if bishop_color is not None:
            query += ' AND bishop_color = ?'
            params.append(bishop_color)

        cursor.execute(query, params)
        result = [row[0] for row in cursor.fetchall()]
        connection.close()
        return result

    def get_record_by_fen(self, fen: str) -> Optional[Record]:
        fen = ' '.join(fen.split(' ')[:4])

        connection = self.get_connection()
        cursor = connection.cursor()
        cursor.execute('SELECT dtz, white, white_to_move, result, bishop_color FROM positions WHERE fen LIKE ?', (fen + '%',))
        result = cursor.fetchone()
        connection.close()

        if result:
            return Record(fen, *result)

        return None
