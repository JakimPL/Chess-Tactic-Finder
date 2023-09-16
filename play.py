import http.server
import os
import socketserver
import threading
import urllib.parse
import webbrowser
from hashlib import md5
from typing import Optional

from modules.configuration import load_configuration
from modules.json import json_save, json_load
from modules.tactic import Tactic

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['output']
GATHERED_PUZZLES_PATH = configuration['paths']['gathered_puzzles']
PROGRESS_PATH = configuration['paths']['progress']

PORT = configuration['tactic_player']['port']
HARD_PROGRESS = configuration['tactic_player']['hard_progress']

TEMP_PATH = 'temp/.temp'

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
    json_save(puzzles, path)


def save(puzzle_id: str = None, value: bool = True):
    progress = {}
    if os.path.exists(PROGRESS_PATH):
        progress = json_load(PROGRESS_PATH)

    if puzzle_id and (not HARD_PROGRESS or puzzle_id not in progress):
        progress[puzzle_id] = value

    json_save(progress, PROGRESS_PATH)
    return progress.get(puzzle_id)


def get_value(value: str) -> Optional[bool]:
    if value == 'true':
        return True
    elif value == 'false':
        return False
    else:
        return None


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

            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.send_response(200)
        elif 'save' in parsed_url.path:
            puzzle_id, value = parsed_url.path.split('/')[-2:]
            value = get_value(value)
            result = save(puzzle_id, value)

            with open(TEMP_PATH, 'w') as file:
                file.write(str(result))

            self.send_response(200)
            self.send_header('Content-type', 'text/plain; charset=UTF-8')
            self.end_headers()

            self.wfile.write(open(TEMP_PATH, 'rb').read())
        else:
            super().do_GET()


def run(httpd):
    httpd.allow_reuse_address = True
    httpd.server_bind()
    httpd.server_activate()
    print(f'Server started at http://localhost:{PORT}')
    httpd.serve_forever()


if __name__ == '__main__':
    refresh()
    save()
    try:
        with socketserver.TCPServer(('', PORT), RefreshHandler, bind_and_activate=False) as httpd:
            thread = threading.Thread(target=lambda: run(httpd), daemon=True)
            thread.start()
            webbrowser.open(f'localhost:{PORT}/tactic_player.html')
            thread.join()
    except KeyboardInterrupt:
        print('Exit.')
    except OSError:
        print('Server already running.')
