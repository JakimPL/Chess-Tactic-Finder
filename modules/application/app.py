import logging
import os
import platform
import sqlite3
import threading
import urllib.parse
import webbrowser

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import (
    FileResponse,
    JSONResponse,
    PlainTextResponse,
    StreamingResponse,
)
from fastapi.staticfiles import StaticFiles

from modules.application.stream import create_process, get_install_path, stream_output
from modules.configuration import load_configuration, save_configuration
from modules.json import json_load
from modules.requests.configuration import Configuration
from modules.requests.move import MoveData
from modules.server.auxiliary import refresh
from modules.server.endgame import EndgameStudySingleton
from modules.server.run import run_linux, run_windows
from modules.server.status_server import StatusServer
from modules.structures.review import Review

configuration = load_configuration()
INPUT_PGN_FILE = configuration["paths"]["input_pgn"]
LOG_FILE = configuration["paths"]["log"]
PORT = configuration["server"]["port"]
OPEN_BROWSER = configuration["server"]["open_browser"]

logging.basicConfig(filename=LOG_FILE, level=logging.DEBUG)
logger = logging.getLogger("handler")

DEFAULT_ERROR_MESSAGE = """
<!DOCTYPE HTML>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>Error response</title>
        <link href="/css/style.css" rel="stylesheet">
    </head>
    <body>
        <h1>Error response</h1>
        <p>Error code: {code}</p>
        <p>Message: {message}.</p>
        <p>Error code explanation: {code} - {explain}.</p>
        <footer>
        </footer>
    </body>
</html>
"""

app = FastAPI()
status_server = StatusServer()
app.mount("/chess", StaticFiles(directory="static", html=True), name="html")
app.mount("/json", StaticFiles(directory="json", html=False), name="json")
app.mount("/reviews", StaticFiles(directory="reviews", html=False), name="reviews")
app.mount("/tactics", StaticFiles(directory="tactics", html=False), name="tactics")


@app.on_event("startup")
async def startup_event():
    listener_thread = threading.Thread(target=status_server.communicate, daemon=True)
    listener_thread.start()

    if OPEN_BROWSER:
        webbrowser.open(f"http://localhost:{PORT}/chess/index.html")


@app.on_event("shutdown")
async def shutdown_event():
    status_server.close()


@app.get("/configuration.json")
async def get_configuration():
    return FileResponse("configuration.json")


@app.get("/refresh")
async def refresh_endpoint(gather: bool = False):
    refresh(logger.info, gather_games=gather)
    return PlainTextResponse("Refreshed.")


@app.get("/analysis_state")
async def analysis_state():
    message = status_server.message
    dictionary = dict(urllib.parse.parse_qsl(message))
    return JSONResponse(dictionary)


@app.get("/reinstall")
async def reinstall():
    async def generate_output():
        logger.info("Reinstalling...")
        path = get_install_path()
        process = create_process(path)
        async for line in stream_output(process):
            yield line

    return StreamingResponse(generate_output(), media_type="text/event-stream")


@app.post("/analyze")
async def analyze(request: Request):
    return await analyze_mode(request, "analyze")


@app.post("/review")
async def review_endpoint(request: Request):
    return await analyze_mode(request, "review")


@app.post("/reviewer/get_chart")
async def get_chart(request: Request):
    data = await request.body()
    path = data.decode("utf-8")[1:]
    dictionary = json_load(path)
    review = Review.from_json(dictionary)
    graph_data = review.plot_evaluations()
    return PlainTextResponse(graph_data)


@app.post("/save_configuration")
async def save_configuration_endpoint(config: Configuration):
    logger.info("Saving configuration...")
    save_configuration(config.dict())
    return PlainTextResponse("Configuration saved.")


@app.post("/endgame/start")
async def endgame_start(data: dict):
    endgame_singleton = EndgameStudySingleton().get_instance()
    endgame_study = endgame_singleton.endgame_study
    layout = data.get("layout")
    dtm = data.get("dtm")
    white = data.get("white")
    bishop_color = data.get("bishop_color")
    if layout is not None and dtm is not None:
        try:
            fen = endgame_study.start_game(layout, dtm, white, bishop_color)
            return JSONResponse({"fen": fen})
        except ValueError:
            raise HTTPException(status_code=400, detail="No position matching the criteria")
        except sqlite3.OperationalError:
            return JSONResponse({"error": f"No database {layout} found"}, status_code=500)
    else:
        raise HTTPException(status_code=400, detail="Required parameters not provided")


@app.post("/endgame/hint")
async def hint(data: MoveData) -> JSONResponse:
    endgame_singleton = EndgameStudySingleton().get_instance()
    endgame_study = endgame_singleton.endgame_study
    reply = endgame_study.get_best_move(data.fen)
    return JSONResponse(reply.__dict__)


@app.post("/endgame/move")
async def endgame_move(data: MoveData) -> JSONResponse:
    endgame_singleton = EndgameStudySingleton().get_instance()
    endgame_study = endgame_singleton.endgame_study
    reply = endgame_study.move(data.fen, data.move, data.beta)
    return JSONResponse(reply.__dict__)


@app.get("/endgame/layouts")
async def endgame_layouts() -> JSONResponse:
    endgame_singleton = EndgameStudySingleton().get_instance()
    endgame_study = endgame_singleton.endgame_study
    layouts = endgame_study.get_layouts()
    return JSONResponse(layouts)


async def analyze_mode(request: Request, mode: str):
    logger.info("Analyzing...")
    pgn = await request.body()
    with open(INPUT_PGN_FILE, "w") as file:
        file.write(pgn.decode("utf-8"))

    if platform.system() == "Windows":
        path = os.path.join("shell", "bat", "analyze.bat")
        command = f"{path} {mode}.py {INPUT_PGN_FILE}"
        run_windows(command)
    elif platform.system() == "Linux":
        path = os.path.join("shell", "sh", "analyze.sh")
        command = f"{path} {mode}.py {INPUT_PGN_FILE}"
        run_linux(command)
    else:
        raise HTTPException(status_code=501, detail=f"Platform {platform.system()} is not supported")

    return PlainTextResponse("Analysis started.")
