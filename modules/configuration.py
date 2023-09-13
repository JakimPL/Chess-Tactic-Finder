import json


def load_configuration(path: str = "configuration.json") -> dict:
    with open(path, 'r') as file:
        return json.load(file)
