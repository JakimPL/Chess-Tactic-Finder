import argparse
import hashlib
import os

from tqdm import tqdm

from modules.configuration import load_configuration
from modules.converter import convert
from modules.finder.analyzer import Analyzer
from modules.server.connection import get_client
from modules.server.message import Message

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['processed']

STOCKFISH_DEPTH = configuration['stockfish']['depth']

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

    name = ''
    if pgn_path:
        print(f'Reading PGN file {pgn_path}...')
        with open(pgn_path, 'r') as file:
            pgn = file.read()
            name = f"[{hashlib.md5(pgn.encode('utf-8')).hexdigest()[:6]}]"

        convert(pgn, INPUT_DIRECTORY)

    filenames = sorted(
        [filename for filename in os.listdir(INPUT_DIRECTORY) if filename != '.gitkeep'],
        key=lambda x: int(x.split('.')[0])
    )

    client = get_client()
    client.send(Message(f'{name} Analysis of {len(filenames)} games started.', 0, len(filenames)).encode())

    success = True
    with tqdm(filenames) as bar:
        for filename in bar:
            analyzer = Analyzer(
                filename=filename,
                client=client,
                id=name,
                analyzed=bar.n,
                total=bar.total,
            )

            try:
                analyzer()
            except KeyboardInterrupt:
                success = False
                print('Interrupted.')
                client.send(Message(f'{name} Analysis interrupted.', bar.n, len(filenames)).encode())
                break

    if success:
        client.send(Message(f'{name} Analysis completed.', len(filenames), len(filenames)).encode())

    client.close()
