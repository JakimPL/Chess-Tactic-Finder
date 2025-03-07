import os


def run_windows(command: str) -> None:
    os.system(f"start /wait cmd /c {command}")


def run_linux(command: str) -> None:
    os.system(f"gnome-terminal -- bash {command}")
