import os
from hashlib import md5
from typing import Optional

from modules.configuration import load_configuration
from modules.json import json_save, json_load
from modules.finder.tactic import Tactic

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['output']
GATHERED_PUZZLES_PATH = configuration['paths']['gathered_puzzles']
PROGRESS_PATH = configuration['paths']['progress']
SOCKET_PATH = configuration['paths']['unix_socket']

PORT = configuration['tactic_player']['port']
HARD_PROGRESS = configuration['tactic_player']['hard_progress']
OPEN_BROWSER = configuration['tactic_player']['open_browser']
SOCKET = configuration['tactic_player']['socket']


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
            'finalEvaluation': str(final_evaluation) if final_evaluation else '',
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


def save_progress(
        logger: Optional[callable] = print,
        puzzle_id: str = None,
        value: Optional[int] = None
):
    progress = {}
    if os.path.exists(PROGRESS_PATH):
        progress = json_load(PROGRESS_PATH)

    if puzzle_id and value is not None and (not HARD_PROGRESS or puzzle_id not in progress):
        progress[puzzle_id] = value
        logger(f'Key {puzzle_id} stored as {value}.')

    json_save(progress, PROGRESS_PATH)
    return progress.get(puzzle_id)


def get_value(value: str) -> Optional[int]:
    try:
        return int(value)
    except ValueError:
        return None


def refresh(logger: Optional[callable] = print, gather_games: bool = True):
    if not os.path.exists(GATHERED_PUZZLES_PATH) or gather_games:
        logger('Gathering games...')
        paths = gather_variations()
        puzzles = gather_puzzles(paths)
        save_puzzles(puzzles)
        logger(f'Puzzle saved to {GATHERED_PUZZLES_PATH}')

    save_progress(logger)
