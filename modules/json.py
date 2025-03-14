import json
from typing import Dict, List, Union


def json_save(dictionary: Union[Dict, List], path: str, indent: int = 4):
    with open(path, "w") as file:
        json.dump(dictionary, file, indent=indent)


def json_load(path: str) -> Union[Dict, List]:
    with open(path, "r") as file:
        return json.load(file)
