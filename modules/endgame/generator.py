import os
import pickle
from concurrent.futures import ProcessPoolExecutor, as_completed
from itertools import permutations
from pathlib import Path
from typing import Generator, List, Optional, Tuple, Union

import chess
import chess.gaviota
import chess.syzygy
from tqdm import tqdm

from modules.endgame import DATABASE_PATH, TABLEBASE_PATH
from modules.endgame.database import EndgameDatabase
from modules.endgame.layout import PiecesLayout


class EndgameGenerator:
    def __init__(
        self,
        tablebase_path: Union[str, os.PathLike] = TABLEBASE_PATH,
        database_path: Union[str, os.PathLike] = DATABASE_PATH,
    ):
        self.tablebase_path = Path(tablebase_path)
        self.database = EndgameDatabase(database_path)

    @staticmethod
    def get_side_pieces(pieces_layout: PiecesLayout, white: bool) -> str:
        return "".join(map(lambda piece: chess.piece_symbol(piece).upper(), pieces_layout.layout[not white]))

    @staticmethod
    def get_bishop_color(square: int) -> bool:
        return bool((square + (square >> 3)) & 1)

    @staticmethod
    def set_board(
        board: chess.Board,
        pieces: List[chess.Piece],
        squares: Tuple[int],
        colors: List[bool],
    ) -> Optional[bool]:
        bishop_color = None
        for square, piece, color in zip(squares, pieces, colors):
            board.set_piece_at(square, chess.Piece(piece, color))
            if piece == chess.BISHOP:
                bishop_color = EndgameGenerator.get_bishop_color(square)

        if sum(piece == chess.BISHOP for piece in pieces) == 1:
            return bishop_color

    @staticmethod
    def deduplicate_permutations(perms: permutations, pieces_layout: PiecesLayout) -> List[Tuple[int, ...]]:
        indices = set()
        signature = zip(pieces_layout.pieces, pieces_layout.colors[chess.WHITE])
        signature = tuple(piece - 1 + 6 * color for piece, color in signature)

        deduplicated_perms = []
        for perm in perms:
            index = frozenset(square | (sig << 6) for square, sig in zip(perm, signature))

            if index in indices:
                continue

            indices.add(index)
            deduplicated_perms.append(perm)

        return deduplicated_perms

    def generate_positions(self, layout: str, batch_size: int = 4096, max_workers: int = 8) -> None:
        pieces_layout = PiecesLayout.from_string(layout)
        perms = permutations(chess.SQUARES, pieces_layout.count)
        deduplicated_perms = self.deduplicate_permutations(perms, pieces_layout)
        batches = self.batch(deduplicated_perms, batch_size)

        partial_results_path = Path(self.database.database_path).parent / layout
        partial_results_path.mkdir(exist_ok=True)

        processed_batches = self.get_processed_batches(partial_results_path)
        self.execute_batches(batches, pieces_layout, processed_batches, partial_results_path, max_workers)

        self.database.create_table(layout)
        self.database.clear_table(layout)
        self.save_items_to_database(layout, partial_results_path)

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
            yield iterable[ndx : min(ndx + n, length)]

    def execute_batches(
        self,
        batches: Generator,
        layout: PiecesLayout,
        processed_batches: List[int],
        partial_results_path: Path,
        max_workers: int,
    ):
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = []
            batch_indices = []
            for i, batch in enumerate(batches):
                if i not in processed_batches:
                    batch_indices.append(i)
                    futures.append(executor.submit(self.process_batch, batch, layout, self.tablebase_path))

            for i, future in tqdm(
                zip(batch_indices, as_completed(futures)),
                desc="Processing positions",
                total=len(futures),
            ):
                partial_result = future.result()
                partial_results_file = partial_results_path / f"{i:04d}.pkl"
                self.save_partial_results(partial_results_file, partial_result)

    @staticmethod
    def process_batch(
        batch,
        pieces_layout: PiecesLayout,
        tablebase_path: Union[str, os.PathLike] = TABLEBASE_PATH,
    ):
        results = []
        tablebase_path = Path(tablebase_path)
        syzygy = chess.syzygy.open_tablebase(str(tablebase_path / "syzygy"))
        gaviota = chess.gaviota.open_tablebase(str(tablebase_path / "gaviota"))

        for squares in batch:
            for white, colors in pieces_layout.colors.items():
                board = chess.Board(None)
                board.clear()
                bishop_color = EndgameGenerator.set_board(board, pieces_layout.pieces, squares, colors)
                white_pieces = EndgameGenerator.get_side_pieces(pieces_layout, white)
                black_pieces = EndgameGenerator.get_side_pieces(pieces_layout, not white)
                for side in (chess.WHITE, chess.BLACK):
                    board.turn = side
                    if not board.is_valid():
                        continue

                    try:
                        dtz = syzygy.probe_dtz(board)
                        dtm = gaviota.probe_dtm(board)
                        result = "win" if dtz > 0 else "loss" if dtz < 0 else "draw"
                        results.append(
                            (
                                board.fen(),
                                int(dtz),
                                int(dtm),
                                white,
                                bool(side),
                                result,
                                white_pieces,
                                black_pieces,
                                bishop_color,
                            )
                        )
                    except Exception as error:
                        print(error)

        syzygy.close()
        gaviota.close()
        return results

    @staticmethod
    def save_partial_results(path: Union[str, os.PathLike], items: List[Tuple]) -> None:
        with open(path, "wb") as file:
            pickle.dump(items, file)

    @staticmethod
    def load_partial_results(path: Union[str, os.PathLike]) -> List[Tuple]:
        with open(path, "rb") as file:
            return pickle.load(file)

    def save_items_to_database(self, layout: str, partial_results_path: Path) -> None:
        for pkl_file in tqdm(
            sorted(partial_results_path.glob("*.pkl")),
            desc="Saving batches to database",
        ):
            batch = self.load_partial_results(pkl_file)
            self.database.save_batch(layout, batch)

        print(f"Database {layout} updated.")
