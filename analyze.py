import argparse

from tqdm import tqdm

from modules.configuration import load_configuration
from modules.converter import convert
from modules.finder.analyzer import Analyzer
from modules.server.connection import get_client
from modules.structures.message import Message
from modules.structures.message_sender import MessageSender

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

    name, filenames = convert(pgn_path)

    client = get_client()
    client.send(Message(f'{name} Analysis of {len(filenames)} games started.', 0, len(filenames)).encode())

    success = True
    with tqdm(filenames) as bar:
        for filename in bar:
            analyzer = Analyzer(
                filename=filename,
                message_sender=MessageSender(
                    client=client,
                    id=name,
                    text='Analyzed',
                    analyzed=bar.n,
                    total=bar.total,
                )
            )

            try:
                analyzer()
            except KeyboardInterrupt:
                success = False
                print('Interrupted.')
                client.send(Message(f'{name} Analysis interrupted.', bar.n, len(filenames)).encode())
                break
            except FileNotFoundError:
                success = False
                print('Stockfish is not properly installed.')
                client.send(Message(f'{name} Stockfish error.', bar.n, len(filenames)).encode())
                break

    if success:
        client.send(Message(f'{name} Analysis completed.', len(filenames), len(filenames)).encode())

    client.close()
