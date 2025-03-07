import pickle


class Picklable:
    def to_file(self, path: str):
        with open(path, "wb") as file:
            pickle.dump(self, file)

    @staticmethod
    def from_file(path: str):
        with open(path, "rb") as file:
            return pickle.load(file)
