import os
from hashlib import md5
from typing import Optional

from modules.configuration import load_configuration
from modules.json import json_load, json_save
from modules.structures.review import Review
from modules.structures.tactic import Tactic
from modules.structures.variations import Variations

configuration = load_configuration()

TACTICS_DIRECTORY = configuration["paths"]["tactics"]
REVIEWS_DIRECTORY = configuration["paths"]["reviews"]
GATHERED_PUZZLES_PATH = configuration["paths"]["gathered_puzzles"]
GATHERED_REVIEWS_PATH = configuration["paths"]["gathered_reviews"]
PROGRESS_PATH = configuration["paths"]["progress"]

HARD_PROGRESS = configuration["tactic_player"]["hard_progress"]


def gather_variations_paths(directory: str = TACTICS_DIRECTORY) -> list[str]:
    paths = []
    for root, dirs, files in os.walk(directory):
        filenames = [os.path.join(root, filename) for filename in files if filename.endswith(".vars")]

        paths.extend(filenames)

    return paths


def gather_reviews_paths(directory: str = REVIEWS_DIRECTORY) -> list[str]:
    paths = []
    for root, dirs, files in os.walk(directory):
        filenames = [os.path.join(root, filename) for filename in files if filename.endswith(".rev")]

        paths.extend(filenames)

    return paths


def gather_puzzles(paths: list[str]) -> list[dict]:
    puzzles = []
    for path in paths:
        tactic = Tactic.from_file(path)
        white = (tactic.headers.get("White", "?"), tactic.headers.get("WhiteElo", "?"))
        black = (tactic.headers.get("Black", "?"), tactic.headers.get("BlackElo", "?"))
        date = tactic.headers.get("Date", "????.??.??")
        actual_result = tactic.headers.get("Result", "*")

        name = f"{white[0]} vs. {black[0]} ({date})"
        moves = tactic.moves
        hardness = tactic.hardness
        puzzle_type = tactic.type
        pgn = str(tactic.to_pgn())
        initial_evaluation = tactic[0].evaluation
        starting_evaluation = tactic[1].evaluation
        final_evaluation = tactic.final_evaluation
        white_to_move = tactic[1].color

        puzzles.append(
            {
                "name": name,
                "puzzleType": puzzle_type,
                "moves": moves,
                "hardness": hardness,
                "initialEvaluation": (str(initial_evaluation) if initial_evaluation else ""),
                "startingEvaluation": (str(starting_evaluation) if starting_evaluation else ""),
                "finalEvaluation": str(final_evaluation) if final_evaluation else "",
                "pgn": pgn,
                "white": white[0],
                "whiteElo": white[1],
                "black": black[0],
                "blackElo": black[1],
                "date": date,
                "actualResult": actual_result,
                "whiteToMove": white_to_move,
                "path": path.replace(".tactic", ".pgn"),
                "hash": md5(path.encode()).hexdigest(),
            }
        )

    return puzzles


def gather_reviews(paths: list[str]) -> list[dict]:
    reviews = []
    for path in paths:
        review = Review.from_file(path)
        white = (review.headers.get("White", "?"), review.headers.get("WhiteElo", "?"))
        black = (review.headers.get("Black", "?"), review.headers.get("BlackElo", "?"))
        date = review.headers.get("Date", "????.??.??")
        actual_result = review.headers.get("Result", "*")

        name = f"{white[0]} vs. {black[0]} ({date})"
        moves = [move.to_json() for move in review.moves]
        pgn = str(review.to_pgn())

        reviews.append(
            {
                "name": name,
                "moves": moves,
                "pgn": pgn,
                "white": white[0],
                "whiteElo": white[1],
                "black": black[0],
                "blackElo": black[1],
                "date": date,
                "actualResult": actual_result,
                "path": path.replace(".rev", ".json"),
                "hash": md5(path.encode()).hexdigest(),
            }
        )

    return reviews


def rewrite_variations_and_tactics(paths: list[str]) -> None:
    for path in paths:
        variations = Variations.from_file(path)
        json_path = path.replace(".vars", ".json")
        json_save(variations.to_json(), json_path)

        tactic = variations.get_tactic()
        game = tactic.to_pgn(ignore_first_move=False, save_last_opponent_move=True)

        tactic_path = path.replace(".vars", ".tactic")
        tactic.to_file(tactic_path)

        pgn_path = path.replace(".vars", ".pgn")
        print(game, file=open(pgn_path, "w"), end="\n\n")


def save_puzzles(puzzles: list[dict], path: str = GATHERED_PUZZLES_PATH) -> None:
    json_save(puzzles, path)


def save_progress(
    logger: Optional[callable] = print,
    puzzle_id: str = None,
    value: Optional[int] = None,
):
    progress = {}
    if os.path.exists(PROGRESS_PATH):
        progress = json_load(PROGRESS_PATH)

    if puzzle_id and value is not None and (not HARD_PROGRESS or puzzle_id not in progress):
        progress[puzzle_id] = value
        logger(f"Key {puzzle_id} stored as {value}.")

    json_save(progress, PROGRESS_PATH)
    return progress.get(puzzle_id)


def save_reviews(reviews: list[dict], path: str = GATHERED_REVIEWS_PATH) -> None:
    json_save(reviews, path)


def get_value(value: str) -> Optional[int]:
    try:
        return int(value)
    except ValueError:
        return None


def refresh(
    logger: Optional[callable] = print,
    gather_games: bool = False,
    rewrite: bool = False,
):
    if not os.path.exists(GATHERED_PUZZLES_PATH) or gather_games:
        logger("Gathering games...")
        paths = gather_variations_paths()
        if rewrite:
            logger("Recalculating tactics...")
            rewrite_variations_and_tactics(paths)

        paths = [path.replace(".vars", ".tactic") for path in paths]
        puzzles = gather_puzzles(paths)
        save_puzzles(puzzles)
        logger(f"Puzzle saved to {GATHERED_PUZZLES_PATH}")

    if not os.path.exists(GATHERED_REVIEWS_PATH) or gather_games:
        logger("Gathering reviews...")
        paths = gather_reviews_paths()
        reviews = gather_reviews(paths)
        save_reviews(reviews)
        logger(f"Reviews saved to {GATHERED_PUZZLES_PATH}")

    save_progress(logger)
