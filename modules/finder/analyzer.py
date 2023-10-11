import os

import chess
import chess.pgn
from chess import Board
from chess.pgn import Headers
from stockfish import Stockfish

from modules.configuration import load_configuration
from modules.finder.tactic_finder import TacticFinder
from modules.json import json_save
from modules.processor import Processor
from modules.structures.evaluation import Evaluation
from modules.structures.position import Position
from modules.structures.tactic import Tactic
from modules.structures.variations import Variations

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['processed']
OUTPUT_DIRECTORY = configuration['paths']['tactics']
STOCKFISH_PATH = configuration['paths']['stockfish']

STOCKFISH_DEPTH = configuration['stockfish']['depth']
STOCKFISH_PARAMETERS = configuration['stockfish']['parameters']
STOCKFISH_TOP_MOVES = configuration['stockfish']['top_moves']

IGNORE_FIRST_MOVE = configuration['export']['ignore_first_move']
SAVE_LAST_OPPONENT_MOVE = configuration['export']['save_last_opponent_move']


class Analyzer(Processor):
    def find_variations(
            self,
            moves,
            starting_position: str,
            headers: Headers,
            output_filename: str,
            stockfish_depth: int = STOCKFISH_DEPTH,
    ) -> tuple[list[Variations], [Tactic]]:
        stockfish = Stockfish(
            path=STOCKFISH_PATH,
            depth=stockfish_depth,
            parameters=STOCKFISH_PARAMETERS
        )

        if starting_position:
            board = Board(starting_position)
            stockfish.set_fen_position(starting_position)
        else:
            board = Board()

        variations_list = []
        tactic_list = []
        fens = set()

        evaluation = Evaluation.from_evaluation(stockfish.get_evaluation())
        for idx, move in enumerate(moves):
            move_number = (idx + 1 - int(board.turn)) // 2 + 1
            white = board.turn

            fen = stockfish.get_fen_position()

            position = Position(
                move=move,
                color=not white,
                evaluation=evaluation,
                fen=fen
            )

            stockfish.make_moves_from_current_position([move])
            evaluation = Evaluation.from_evaluation(stockfish.get_evaluation())
            board_move = chess.Move.from_uci(move)
            board_move = board.san(board_move)
            board.push_san(move)

            move_string = f'{move_number}{"." if white else "..."} {board_move} {"   " if white else " "}'
            print(f'{move_string}\t{evaluation}')

            self.message_sender(
                filename=output_filename,
                fen=board.fen(),
                move_string=move_string,
                evaluation=evaluation
            )

            tactic_finder = TacticFinder(stockfish, not white, starting_position=position, fens=fens)
            variations, tactic = tactic_finder.get_variations(headers=headers)
            fens = fens.union(tactic_finder.visited_fens)

            if tactic:
                tactic_list.append(tactic)
                variations_list.append(variations)
                print(f'Tactic:\n{tactic}')

        return variations_list, tactic_list

    @staticmethod
    def save_variations(
            variations_list: list[Variations],
            tactic_list: list[Tactic],
            directory: str,
            ignore_first_move: bool = IGNORE_FIRST_MOVE,
            save_last_opponent_move: bool = SAVE_LAST_OPPONENT_MOVE
    ):
        for index, (variations, tactic) in enumerate(list(zip(variations_list, tactic_list))):
            game = tactic.to_pgn(
                ignore_first_move=ignore_first_move,
                save_last_opponent_move=save_last_opponent_move
            )

            prefix = f'tactic_{index:04}'

            variations_filename = f'{prefix}.vars'
            variations_path = os.path.join(directory, variations_filename)
            variations.to_file(variations_path)

            json_filename = f'{prefix}.json'
            json_path = os.path.join(directory, json_filename)
            json_save(variations.to_json(), json_path)

            tactic_filename = f'{prefix}.tactic'
            tactic_path = os.path.join(directory, tactic_filename)
            tactic.to_file(tactic_path)

            pgn_filename = f'{prefix}.pgn'
            pgn_path = os.path.join(directory, pgn_filename)
            print(game, file=open(pgn_path, 'w'), end='\n\n')

    def __call__(self):
        game_path = os.path.join(INPUT_DIRECTORY, self.filename)
        data = self.preprocess(game_path, OUTPUT_DIRECTORY)

        if data is None:
            return

        moves, headers, starting_position, output_filename, directory, in_progress_file = data
        print(f'Finding tactics for: {output_filename}')

        variations_list = None
        tactic_list = None

        try:
            variations_list, tactic_list = self.find_variations(
                moves=moves,
                starting_position=starting_position,
                headers=headers,
                output_filename=output_filename
            )

        except ValueError as error:
            print(f'Stockfish error: {error}')
        except KeyboardInterrupt:
            raise KeyboardInterrupt('interrupted')

        if tactic_list:
            self.save_variations(variations_list, tactic_list, directory)
            print(f'Saved {len(tactic_list)} tactics.')
        else:
            print(f'No tactics found.')

        os.remove(in_progress_file)
