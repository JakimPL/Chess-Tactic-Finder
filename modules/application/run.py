import os
import platform

from fastapi import HTTPException

from modules.server.run import run_linux, run_windows


def run_script(file: str, argument: str):
    if platform.system() == "Windows":
        path = os.path.join("shell", "bat", "analyze.bat")
        command = f"{path} {file}.py {argument}"
        run_windows(command)
    elif platform.system() == "Linux":
        path = os.path.join("shell", "sh", "analyze.sh")
        command = f"{path} {file}.py {argument}"
        run_linux(command)
    else:
        raise HTTPException(status_code=501, detail=f"Platform {platform.system()} is not supported")
