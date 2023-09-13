from modules.json import json_load


def load_configuration(path: str = "configuration.json") -> dict | list:
    return json_load(path)
