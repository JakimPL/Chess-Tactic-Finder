import json
import os
import subprocess
import webbrowser

from configuration import load_configuration
from variations import Variations

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['output']
GATHERED_GAMES_PATH = configuration['paths']['gathered_games']
PORT = configuration['tactic_player']['port']


def gather_variations(directory: str = INPUT_DIRECTORY) -> list[str]:
    paths = []
    for root, dirs, files in os.walk(directory):
        filenames = [
            os.path.join(root, filename)
            for filename in files if filename.endswith('.vars')
        ]

        paths.extend(filenames)

    return paths


def gather_games(paths: list[str]) -> list[dict]:
    games = []
    for path in paths:
        variations = Variations.from_file(path)
        white = (variations.headers.get('White', '?'), variations.headers.get('WhiteElo', '?'))
        black = (variations.headers.get('Black', '?'), variations.headers.get('BlackElo', '?'))
        date = variations.headers.get('Date', '????.??.??')
        actual_result = variations.headers.get('Result', '*')

        name = f'{white[0]} vs. {black[0]} ({date})'
        tactic = variations.get_tactic()
        moves = tactic.moves
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
            'path': path.replace('.vars', '.pgn')
        })

    return games


def save_games(games: list[dict], path: str = GATHERED_GAMES_PATH) -> None:
    with open(path, 'w') as file:
        json.dump(games, file, indent=4)


if __name__ == '__main__':
    paths = gather_variations()
    games = gather_games(paths)
    save_games(games)
    webbrowser.open('localhost:8000/tactic_player.html')
    subprocess.run(['python', '-m', 'http.server', str(PORT)])

