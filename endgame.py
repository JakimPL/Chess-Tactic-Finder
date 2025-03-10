import argparse

from modules.configuration import load_configuration
from modules.endgame.generator import EndgameGenerator
from modules.server.connection import get_client
from modules.structures.message import Message

configuration = load_configuration()
DEFAULT_TABLEBASE_PATH = configuration["paths"]["tablebase"]
DEFAULT_DATABASE_PATH = configuration["paths"]["database"]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate endgame positions with the specified layout.")
    parser.add_argument("layout", type=str, help="The layout for generating endgame positions.")
    parser.add_argument(
        "--tablebase",
        type=str,
        default=DEFAULT_TABLEBASE_PATH,
        help="Path to the tablebase.",
    )
    parser.add_argument(
        "--database",
        type=str,
        default=DEFAULT_DATABASE_PATH,
        help="Path to the database.",
    )
    args = parser.parse_args()

    layout = args.layout
    tablebase_path = args.tablebase
    database_path = args.database

    client = get_client()
    client.send(Message(f"Generation of {layout} positions started.", 0, 1).encode())

    endgame_generator = EndgameGenerator(client, tablebase_path=tablebase_path, database_path=database_path)

    try:
        endgame_generator.generate_positions(layout)
        client.send(Message(f"Generation of {layout} positions completed.", 0, 0).encode())
    except KeyboardInterrupt:
        print("Interrupted.")
        client.send(Message(f"Generation of {layout} positions interrupted.", 0, 0).encode())
    except Exception as e:
        print(f"Error: {str(e)}")
        client.send(Message(f"Generation of {layout} positions failed: {str(e)}", 0, 0).encode())

    client.close()
