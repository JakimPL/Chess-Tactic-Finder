import os
import re
import subprocess

from modules.configuration import load_configuration

UCI_MOVE_PATTERN = re.compile(r"[a-h][1-8][a-h][1-8]")
FILENAME_PATTERN = re.compile(r"\d+\.pgn")
SPLIT = True

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['processed']
PGN_EXTRACT_PATH = configuration['paths']['pgn_extract']
TEMP_FILE = configuration['paths']['temp_file']


def convert(pgn: str, output_path: str, temp_file: str = TEMP_FILE):
    absolute_path = os.path.abspath(temp_file)
    with open(absolute_path, "w") as file:
        file.write(pgn)

    filenames = [
        filename for filename in os.listdir(output_path)
        if re.findall(FILENAME_PATTERN, filename) and filename != ".gitkeep"
    ]

    for filename in filenames:
        os.remove(os.path.join(output_path, filename))

    try:
        subprocess.run(
            [PGN_EXTRACT_PATH, "-#1,0", "-Wuci", absolute_path],
            stdout=subprocess.PIPE,
            cwd=output_path
        )
    except FileNotFoundError:
        print(f"pgn-extract not found in: {PGN_EXTRACT_PATH}. Please set the path in configuration.json")
        exit(1)


def get_moves(path: str):
    with open(path, "r") as file:
        result = file.read()

    result = str(result).splitlines()

    moves = [
        line
        for line in result
        if line and "[" not in line and re.findall(UCI_MOVE_PATTERN, line)
    ]

    assert len(moves), "No moves in the PGN file"
    return moves[0].lower().split()[:-1]
