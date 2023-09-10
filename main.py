import argparse
import hashlib
import os

import chess
import chess.pgn
from chess import Board
from stockfish import Stockfish
from tqdm import tqdm

from configuration import load_configuration
from converter import convert, get_moves
from evaluation import Evaluation
from position import Position
from tactic_finder import TacticFinder

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['processed']
OUTPUT_DIRECTORY = configuration['paths']['output']

STOCKFISH_PATH = configuration['stockfish']['path']
STOCKFISH_DEPTH = configuration['stockfish']['depth']
STOCKFISH_PARAMETERS = configuration['stockfish']['parameters']

IGNORE_FIRST_MOVE = configuration['export']['ignore_first_move']
SAVE_LAST_OPPONENT_MOVE = configuration['export']['save_last_opponent_move']


def find_tactics(moves, starting_position: str):
    stockfish = Stockfish(
        path=STOCKFISH_PATH,
        depth=STOCKFISH_DEPTH,
        parameters=STOCKFISH_PARAMETERS
    )

    if starting_position:
        board = Board(starting_position)
        stockfish.set_fen_position(starting_position)
    else:
        board = Board()

    tactics = []
    fens = set()

    for idx, move in enumerate(moves):
        move_number = idx // 2 + 1
        white = idx % 2 == 0
        best_moves = stockfish.get_top_moves()
        evaluation = Evaluation.from_stockfish(best_moves[0])

        fen = stockfish.get_fen_position()
        position = Position(
            move=move,
            color=white,
            evaluation=evaluation,
            fen=fen
        )

        stockfish.make_moves_from_current_position([move])
        board_move = chess.Move.from_uci(move)
        board_move = board.san(board_move)
        board.push_san(move)

        print(f'{move_number}{"." if white else "..."} {board_move} {"   " if white else " "}\t{evaluation}')

        tactic_finder = TacticFinder(stockfish, not white, starting_position=position, fens=fens, hard_evaluation=False)
        tactic = tactic_finder.find_tactic()
        fens = fens.union(tactic_finder.visited_fens)

        if tactic:
            tactics.append(tactic)
            print(f'Tactic:\n{tactic}')

    return tactics


def save_tactics(
        tactics: list[Position],
        directory: str,
        headers: dict,
        ignore_first_move: bool = IGNORE_FIRST_MOVE,
        save_last_opponent_move: bool = SAVE_LAST_OPPONENT_MOVE
):
    for index, tactic in enumerate(tactics):
        game = tactic.to_pgn(headers, ignore_first_move=ignore_first_move)

        prefix = f'tactic_{index:04}'
        tactic_filename = f'{prefix}.tactic'
        tactic_path = os.path.join(directory, tactic_filename)
        tactic.to_file(tactic_path)

        pgn_filename = f'{prefix}.pgn'
        pgn_path = os.path.join(directory, pgn_filename)
        print(game, file=open(pgn_path, 'w'), end='\n\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        prog='ChessTacticFinder',
        description='A tool for finding tactics out of PGN files.'
    )

    parser.add_argument('pgn', type=str, help='Path to the PGN file.')
    args = parser.parse_args()
    pgn_path = args.pgn

    print(configuration)
    print(f'Reading PGN file {pgn_path}...')
    with open(pgn_path, 'r') as file:
        pgn = file.read()

    convert(pgn, INPUT_DIRECTORY)
    for filename in tqdm(sorted(os.listdir(INPUT_DIRECTORY), key=lambda x: int(x.split('.')[0]))):
        game_path = os.path.join(INPUT_DIRECTORY, filename)
        moves = get_moves(game_path)
        game = chess.pgn.read_game(open(game_path))
        game_hash = hashlib.md5(str(game).encode()).hexdigest()
        headers = game.headers
        starting_position = headers.get('FEN')

        output_filename = f"{headers.get('White', '_')} vs {headers.get('Black', '_')} ({headers.get('Date', '___')}) [{game_hash}]"
        directory = os.path.join(OUTPUT_DIRECTORY, output_filename)
        in_progress_file = os.path.join(directory, '.progress')
        if os.path.isdir(directory):
            if not os.path.exists(in_progress_file):
                print(f'Tactics for {output_filename} are already found.')
                continue
        else:
            os.mkdir(directory)

        open(in_progress_file, 'a').close()
        print(f'Finding tactics for: {output_filename}')

        tactics = None
        try:
            tactics = find_tactics(moves, starting_position)
        except KeyboardInterrupt:
            print('Interrupted.')
            break

        if tactics:
            save_tactics(tactics, directory)
            print(f'Saved {len(tactics)} tactics.')
        else:
            print(f'No tactics found.')

        os.remove(in_progress_file)
