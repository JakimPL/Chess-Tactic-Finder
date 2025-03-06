import argparse

from modules.configuration import load_configuration
from modules.endgame.generator import EndgameGenerator

configuration = load_configuration()
DEFAULT_TABLEBASE_PATH = configuration['paths']['tablebase']
DEFAULT_DATABASE_PATH = configuration['paths']['database']

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Generate endgame positions with the specified layout.'
    )
    parser.add_argument('layout', type=str, help='The layout for generating endgame positions.')
    parser.add_argument('--tablebase', type=str, default=DEFAULT_TABLEBASE_PATH, help='Path to the tablebase.')
    parser.add_argument('--database', type=str, default=DEFAULT_DATABASE_PATH, help='Path to the database.')
    args = parser.parse_args()

    layout = args.layout
    tablebase_path = args.tablebase
    database_path = args.database

    endgame_generator = EndgameGenerator(
        tablebase_path=tablebase_path,
        database_path=database_path
    )

    endgame_generator.generate_positions(layout)
