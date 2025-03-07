import json


def json_save(dictionary: dict | list, path: str, indent: int = 4):
    with open(path, "w") as file:
        json.dump(dictionary, file, indent=indent)


def json_load(path: str) -> dict | list:
    with open(path, "r") as file:
        return json.load(file)
