import math
import os
import pickle
from concurrent.futures import ProcessPoolExecutor, as_completed
from itertools import permutations
from multiprocessing.connection import Client
from pathlib import Path
from typing import Generator, List, Optional, Tuple, Union

import chess
import chess.gaviota
import chess.syzygy
from tqdm import tqdm

from modules.endgame import TABLEBASE_PATH, TEMP_PATH
from modules.endgame.database import EndgameDatabase
from modules.endgame.layout import PiecesLayout
from modules.server.client import DummyClient
from modules.structures.message import Message
from modules.symmetry.combination import Combination


class EndgameGenerator:
    def __init__(
        self,
        client: Union[Client, DummyClient],
        tablebase_path: Union[str, os.PathLike] = TABLEBASE_PATH,
    ):
        self.client = client
        self.tablebase_path = Path(tablebase_path)
        self.database = EndgameDatabase()

    @staticmethod
    def get_side_pieces(pieces_layout: PiecesLayout, white: bool) -> str:
        return "".join(map(lambda piece: chess.piece_symbol(piece).upper(), pieces_layout.layout[not white]))

    @staticmethod
    def get_bishop_color(square: int) -> bool:
        return bool((square + (square >> 3)) & 1)

    @staticmethod
    def set_board(
        board: chess.Board,
        squares: Tuple[int, ...],
        pieces_layout: PiecesLayout,
    ) -> Optional[bool]:
        bishop_color = False
        for square, piece, color in zip(squares, pieces_layout.pieces, pieces_layout.colors):
            board.set_piece_at(square, chess.Piece(piece, color))
            if piece == chess.BISHOP:
                bishop_color = EndgameGenerator.get_bishop_color(square)

        return bishop_color and sum(piece == chess.BISHOP for piece in pieces_layout.pieces) == 1

    @staticmethod
    def calculate_combinations(pieces_layout: PiecesLayout) -> List[Tuple[int, ...]]:
        total = math.perm(len(chess.SQUARES), pieces_layout.count)
        perms = permutations(chess.SQUARES, pieces_layout.count)
        symmetric = pieces_layout.symmetric

        hashes = set()
        unique_combinations = []
        for perm in tqdm(perms, total=total, desc="Preparing permutations"):
            arrangement = pieces_layout.arrange(perm)
            if hash(arrangement) in hashes:
                continue

            combination = Combination(arrangement, pieces_layout.transformation_group)
            hashes.update(map(hash, combination.generate_all_arrangements()))
            if symmetric:
                mirror_arrangement = arrangement[2 : pieces_layout.count // 2] + arrangement[: pieces_layout.count // 2]
                mirror_combination = Combination(mirror_arrangement, pieces_layout.transformation_group)
                hashes.update(map(hash, mirror_combination.generate_all_arrangements()))

            unique_combinations.append(combination.flatten())

        return unique_combinations

    @staticmethod
    def load_unique_combinations(pieces_layout: PiecesLayout) -> List[Tuple[int, ...]]:
        path = Path(TEMP_PATH) / f"{pieces_layout.name}.pkl"
        if path.exists():
            with open(path, "rb") as file:
                return pickle.load(file)
        else:
            unique_combinations = EndgameGenerator.calculate_combinations(pieces_layout)
            with open(path, "wb") as file:
                pickle.dump(unique_combinations, file)
            return unique_combinations

    def generate_positions(self, layout: str, batch_size: int = 4096, max_workers: int = 8) -> None:
        pieces_layout = PiecesLayout.from_string(layout)
        unique_combinations = self.load_unique_combinations(pieces_layout)
        batches = self.batch(unique_combinations, batch_size)

        partial_results_path = Path(TEMP_PATH) / layout
        partial_results_path.mkdir(exist_ok=True, parents=True)

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
    def batch(iterable, n: int = 1):
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

            total = len(batch_indices)
            for j, (i, future) in tqdm(
                enumerate(zip(batch_indices, as_completed(futures))),
                desc="Processing positions",
                total=total,
            ):
                partial_result, fen = future.result()
                partial_results_file = partial_results_path / f"{i:04d}.pkl"
                self.save_partial_results(partial_results_file, partial_result)
                self.send_message(j + 1, total, fen)

    @staticmethod
    def get_fen_from_arrangement(arrangement: Tuple[int, ...], layout: PiecesLayout) -> Optional[str]:
        if not arrangement:
            return

        board = chess.Board(None)
        board.clear()
        for square, piece, color in zip(arrangement, layout.pieces, layout.colors):
            board.set_piece_at(square, chess.Piece(piece, color))

        return board.fen()

    @staticmethod
    def process_batch(
        batch,
        pieces_layout: PiecesLayout,
        tablebase_path: Union[str, os.PathLike] = TABLEBASE_PATH,
    ) -> Tuple[List[Tuple], Optional[str]]:
        results = []
        tablebase_path = Path(tablebase_path)
        syzygy = chess.syzygy.open_tablebase(str(tablebase_path / "syzygy"))
        gaviota = chess.gaviota.open_tablebase(str(tablebase_path / "gaviota"))

        for squares in batch:
            board = chess.Board(None)
            board.clear()
            bishop_color = EndgameGenerator.set_board(board, squares, pieces_layout)
            for side in (chess.WHITE, chess.BLACK):
                board.turn = side
                if not board.is_valid():
                    continue

                arrangement = ",".join(map(str, squares))
                try:
                    dtz = int(syzygy.probe_dtz(board))
                    dtm = int(gaviota.probe_dtm(board))
                    results.append(
                        (
                            arrangement,
                            side,
                            dtz,
                            dtm,
                            bishop_color,
                        )
                    )
                except Exception as error:
                    print(error)

        syzygy.close()
        gaviota.close()

        arrangement = results[-1][0] if results else None
        arrangement = tuple(map(int, arrangement.split(","))) if arrangement else None
        fen = EndgameGenerator.get_fen_from_arrangement(arrangement, pieces_layout)

        return results, fen

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

    def send_message(self, analyzed: int, total: int, fen: Optional[str] = None) -> None:
        percent = analyzed / total * 100
        text = f"Generated {analyzed} endgames of {total} games ({percent:.2f}%)..."
        message = Message(text=text, analyzed=analyzed, total=total, fen=fen)

        self.client.send(message.encode())
