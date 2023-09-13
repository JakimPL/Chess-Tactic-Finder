import json
import os
import subprocess
import webbrowser

from modules.configuration import load_configuration
from modules.tactic import Tactic

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['output']
GATHERED_GAMES_PATH = configuration['paths']['gathered_games']
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


def gather_games(paths: list[str]) -> list[dict]:
    games = []
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

        games.append({
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
            'path': path.replace('.tactic', '.pgn')
        })

    return games


def save_games(games: list[dict], path: str = GATHERED_GAMES_PATH) -> None:
    with open(path, 'w') as file:
        json.dump(games, file, indent=4)


if __name__ == '__main__':
    paths = gather_variations()
    games = gather_games(paths)
    save_games(games)

    process = None
    try:
        process = subprocess.Popen(['python', '-m', 'http.server', str(PORT)])
        webbrowser.open('localhost:8000/tactic_player.html')
        process.communicate()
    except KeyboardInterrupt:
        print('Exit.')
    except OSError:
        print("Server already running.")
    finally:
        process.kill()

