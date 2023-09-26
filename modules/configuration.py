from modules.json import json_load, json_save

CONFIGURATION_PATH = "configuration.json"


def load_configuration(path: str = CONFIGURATION_PATH) -> dict | list:
    return json_load(path)


def save_configuration(configuration: dict | list, path: str = CONFIGURATION_PATH):
    json_save(configuration, path)


def set_field(key: str, value: any, path: str = CONFIGURATION_PATH):
    configuration = load_configuration(path)

    configuration_part = configuration
    key_parts = key.split('.')
    for key_part in key_parts[:-1]:
        configuration_part = configuration_part[key_part]

    configuration_part[key_parts[-1]] = value
    json_save(configuration, path)
