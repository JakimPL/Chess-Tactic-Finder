import hashlib
import os

import chess.pgn

from modules.converter import get_moves
from modules.server.message_sender import MessageSender


class Processor:
    def __init__(
            self,
            filename: str,
            message_sender: MessageSender
    ):
        self.filename = filename
        self.message_sender = message_sender

    @staticmethod
    def preprocess(game_path: str, output_directory: str):
        moves = get_moves(game_path)
        game = chess.pgn.read_game(open(game_path))
        game_hash = hashlib.md5(str(game).encode()).hexdigest()
        headers = game.headers
        starting_position = headers.get('FEN')

        output_filename = f"{headers.get('White', '_')} vs {headers.get('Black', '_')} ({headers.get('Date', '___')}) [{game_hash}]"
        directory = os.path.join(output_directory, output_filename)
        in_progress_file = os.path.join(directory, '.progress')
        if os.path.isdir(directory):
            if not os.path.exists(in_progress_file):
                print(f'Analysis for {output_filename} are already found.')
                return
        else:
            os.mkdir(directory)

        open(in_progress_file, 'a').close()
        return moves, headers, starting_position, output_filename, directory, in_progress_file
