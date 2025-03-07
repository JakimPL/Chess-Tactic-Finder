class Singleton:
    _instances = {}

    def __new__(cls, *args, **kwargs):
        if cls not in cls._instances:
            instance = super(Singleton, cls).__new__(cls)
            cls._instances[cls] = instance
            instance.init(*args, **kwargs)
        return cls._instances[cls]

    def init(self, *args, **kwargs):
        pass

    @classmethod
    def get_instance(cls):
        if cls not in cls._instances:
            cls._instances[cls] = cls()
        return cls._instances[cls]
