import os
import platform
import subprocess
from select import select

from fastapi import HTTPException


def get_install_path():
    if platform.system() == "Windows":
        return os.path.join("shell", "bat", "install.bat")
    elif platform.system() == "Linux":
        return os.path.join("shell", "sh", "install.sh")
    raise HTTPException(status_code=501, detail=f"Platform {platform.system()} is not supported")


def create_process(path):
    return subprocess.Popen(
        [path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1, universal_newlines=True
    )


def stream_type(line):
    if "[notice]" in line or "--202" in line:
        return "[STDOUT]"
    return "[STDERR]" if line.strip() else "[STDOUT]"


def format_output(line, stream="STDOUT"):
    return f"data: [{stream}] {line}\n\n"


async def stream_output(process):
    while True:
        reads = [process.stdout.fileno(), process.stderr.fileno()]
        ret = select(reads, [], [])

        for fd in ret[0]:
            if fd == process.stdout.fileno():
                line = process.stdout.readline()
                if line:
                    yield format_output(line)
            if fd == process.stderr.fileno():
                line = process.stderr.readline()
                if line:
                    yield format_output(line, stream_type(line)[1:-1])

        if process.poll() is not None:
            break

    yield "data: [END]   \n\n"
