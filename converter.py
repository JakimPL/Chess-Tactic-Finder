import os
import re
import subprocess

UCI_MOVE_PATTERN = re.compile(r"[a-h][1-8][a-h][1-8]")
SPLIT = True


def convert(pgn: str, output_path: str, temp_file: str = "temp.pgn"):
    absolute_path = os.path.abspath(temp_file)
    with open(absolute_path, "w") as file:
        file.write(pgn)

    for filename in os.listdir(output_path):
        os.remove(os.path.join(output_path, filename))

    subprocess.run(
        ["pgn-extract", "-#1,0", "-Wuci", absolute_path],
        stdout=subprocess.PIPE,
        cwd=output_path
    )


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
