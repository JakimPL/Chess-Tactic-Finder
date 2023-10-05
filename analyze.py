import argparse
import hashlib
import os

import chess
import chess.pgn
from chess import Board
from stockfish import Stockfish
from tqdm import tqdm

from modules.configuration import load_configuration
from modules.converter import convert, get_moves
from modules.finder.evaluation import Evaluation
from modules.finder.position import Position
from modules.finder.tactic import Tactic
from modules.finder.tactic_finder import TacticFinder
from modules.finder.variations import Variations
from modules.server.connection import get_client

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['processed']
OUTPUT_DIRECTORY = configuration['paths']['output']
STOCKFISH_PATH = configuration['paths']['stockfish']

STOCKFISH_DEPTH = configuration['stockfish']['depth']
STOCKFISH_PARAMETERS = configuration['stockfish']['parameters']
STOCKFISH_TOP_MOVES = configuration['stockfish']['top_moves']

IGNORE_FIRST_MOVE = configuration['export']['ignore_first_move']
SAVE_LAST_OPPONENT_MOVE = configuration['export']['save_last_opponent_move']


def find_variations(
        moves,
        starting_position: str,
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

    for idx, move in enumerate(moves):
        move_number = idx // 2 + 1
        white = idx % 2 == 0
        best_moves = stockfish.get_top_moves(STOCKFISH_TOP_MOVES)
        evaluation = Evaluation.from_stockfish(best_moves[0])

        fen = stockfish.get_fen_position()
        position = Position(
            move=move,
            color=not white,
            evaluation=evaluation,
            fen=fen
        )

        stockfish.make_moves_from_current_position([move])
        board_move = chess.Move.from_uci(move)
        board_move = board.san(board_move)
        board.push_san(move)

        print(f'{move_number}{"." if white else "..."} {board_move} {"   " if white else " "}\t{evaluation}')

        tactic_finder = TacticFinder(stockfish, not white, starting_position=position, fens=fens)
        variations, tactic = tactic_finder.get_variations(headers=headers)
        fens = fens.union(tactic_finder.visited_fens)

        if tactic:
            tactic_list.append(tactic)
            variations_list.append(variations)
            print(f'Tactic:\n{tactic}')

    return variations_list, tactic_list


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

        tactic_filename = f'{prefix}.tactic'
        tactic_path = os.path.join(directory, tactic_filename)
        tactic.to_file(tactic_path)

        pgn_filename = f'{prefix}.pgn'
        pgn_path = os.path.join(directory, pgn_filename)
        print(game, file=open(pgn_path, 'w'), end='\n\n')


def analyze(filename: str):
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
            return
    else:
        os.mkdir(directory)

    open(in_progress_file, 'a').close()
    print(f'Finding tactics for: {output_filename}')

    variations_list = None
    tactic_list = None
    try:
        variations_list, tactic_list = find_variations(moves, starting_position)
    except ValueError as error:
        print(f'Stockfish error: {error}')
    except KeyboardInterrupt:
        raise KeyboardInterrupt('interrupted')

    if tactic_list:
        save_variations(variations_list, tactic_list, directory)
        print(f'Saved {len(tactic_list)} tactics.')
    else:
        print(f'No tactics found.')

    os.remove(in_progress_file)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        prog='ChessTacticFinder',
        description='A tool for finding tactics out of PGN files.'
    )

    parser.add_argument('pgn', type=str, nargs='?', help='Path to the PGN file.')
    parser.add_argument('--depth', '-d', type=int, help='Stockfish depth', default=STOCKFISH_DEPTH)
    args = parser.parse_args()
    pgn_path = args.pgn
    stockfish_depth = args.depth

    if pgn_path:
        print(f'Reading PGN file {pgn_path}...')
        with open(pgn_path, 'r') as file:
            pgn = file.read()

        convert(pgn, INPUT_DIRECTORY)

    filenames = sorted(os.listdir(INPUT_DIRECTORY), key=lambda x: int(x.split('.')[0]))

    client = get_client()
    client.send(f'Analysis of {len(filenames)} games started.')

    success = True
    with tqdm(filenames) as bar:
        for filename in bar:
            try:
                client.send('Analyzed {items} of {total} games ({percent:.2f}%).'.format(
                    items=bar.n,
                    total=bar.total,
                    percent=100 * bar.n / bar.total if bar.total > 0 else 100
                ))

                analyze(filename)
            except KeyboardInterrupt:
                success = False
                print('Interrupted.')
                client.send('Analysis interrupted.')
                break

    if success:
        client.send('Analysis completed.')

    client.close()
