from modules.configuration import load_configuration

configuration = load_configuration()
TABLEBASE_PATH = configuration["paths"]["tablebase"]
DATABASE_PATH = configuration["paths"]["database"]
