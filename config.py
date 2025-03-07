import argparse

from modules.configuration import set_field

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "kv",
        type=str,
        nargs=2,
        help='Key and value, eg. "paths.pgn_extract ./pgn-extract"',
    )

    args = parser.parse_args()
    key, value = args.kv

    try:
        set_field(key, value)
        print(f"Successfully set value {key} to {value}.")
    except Exception as exception:
        print(exception)
