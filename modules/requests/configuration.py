from pydantic import BaseModel


class Configuration(BaseModel):
    paths: dict
