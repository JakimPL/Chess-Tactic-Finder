from typing import Dict, List, Union

from modules.json import json_load, json_save

CONFIGURATION_PATH = "configuration.json"


def load_configuration(path: str = CONFIGURATION_PATH) -> Union[Dict, List]:
    return json_load(path)


def save_configuration(configuration: Union[Dict, List], path: str = CONFIGURATION_PATH):
    json_save(configuration, path)


def set_field(key: str, value: any, path: str = CONFIGURATION_PATH):
    configuration = load_configuration(path)

    configuration_part = configuration
    key_parts = key.split(".")
    for key_part in key_parts[:-1]:
        configuration_part = configuration_part[key_part]

    key = key_parts[-1]
    if key not in configuration_part:
        raise KeyError(f"Key {key} not found in the configuration.")

    if isinstance(configuration_part[key], dict):
        raise ValueError(f"Key {key} is a dictionary, cannot assign the value.")

    new_value = type(configuration_part[key])(value)
    configuration_part[key] = new_value
    json_save(configuration, path)
