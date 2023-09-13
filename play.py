import http.server
import json
import os
import socketserver
import urllib.parse
import webbrowser
from hashlib import md5

from modules.configuration import load_configuration
from modules.tactic import Tactic

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['output']
GATHERED_PUZZLES_PATH = configuration['paths']['gathered_puzzles']
PORT = configuration['tactic_player']['port']


def gather_variations(directory: str = INPUT_DIRECTORY) -> list[str]:
    paths = []
    for root, dirs, files in os.walk(directory):
        filenames = [
            os.path.join(root, filename)
            for filename in files if filename.endswith('.tactic')
        ]

        paths.extend(filenames)

    return paths


def gather_puzzles(paths: list[str]) -> list[dict]:
    puzzles = []
    for path in paths:
        tactic = Tactic.from_file(path)
        white = (tactic.headers.get('White', '?'), tactic.headers.get('WhiteElo', '?'))
        black = (tactic.headers.get('Black', '?'), tactic.headers.get('BlackElo', '?'))
        date = tactic.headers.get('Date', '????.??.??')
        actual_result = tactic.headers.get('Result', '*')

        name = f'{white[0]} vs. {black[0]} ({date})'
        moves = tactic.moves
        hardness = tactic.hardness
        puzzle_type = tactic.type
        pgn = str(tactic.to_pgn())
        initial_evaluation = tactic[0].evaluation
        starting_evaluation = tactic[1].evaluation
        final_evaluation = tactic.final_evaluation
        white_to_move = tactic[1].color

        puzzles.append({
            'name': name,
            'puzzleType': puzzle_type,
            'moves': moves,
            'hardness': hardness,
            'initialEvaluation': str(initial_evaluation) if initial_evaluation else '',
            'startingEvaluation': str(starting_evaluation) if starting_evaluation else '',
            'final_evaluation': str(final_evaluation) if final_evaluation else '',
            'pgn': pgn,
            'white': white[0],
            'whiteElo': white[1],
            'black': black[0],
            'blackElo': black[1],
            'date': date,
            'actualResult': actual_result,
            'whiteToMove': white_to_move,
            'path': path.replace('.tactic', '.pgn'),
            'hash': md5(path.encode()).hexdigest()
        })

    return puzzles


def save_puzzles(puzzles: list[dict], path: str = GATHERED_PUZZLES_PATH) -> None:
    with open(path, 'w') as file:
        json.dump(puzzles, file, indent=4)


def refresh():
    print('Gathering games...')
    paths = gather_variations()
    puzzles = gather_puzzles(paths)
    save_puzzles(puzzles)
    print(f'Puzzle saved to {GATHERED_PUZZLES_PATH}')


class RefreshHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == '/refresh':
            refresh()

            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
        else:
            super().do_GET()


if __name__ == '__main__':
    try:
        with socketserver.TCPServer(('', PORT), RefreshHandler, bind_and_activate=False) as httpd:
            httpd.allow_reuse_address = True
            httpd.server_bind()
            httpd.server_activate()
            print(f'Server started at http://localhost:{PORT}')
            httpd.serve_forever()

        webbrowser.open(f'localhost:{PORT}/tactic_player.html')
    except KeyboardInterrupt:
        print('Exit.')
    except OSError:
        print('Server already running.')
