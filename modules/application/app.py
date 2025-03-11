import logging
import os
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
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import HTMLResponse, RedirectResponse

from modules.application import DEFAULT_ERROR_MESSAGE
from modules.application.run import run_script
from modules.application.stream import create_process, get_install_path, stream_output
from modules.configuration import load_configuration, save_configuration
from modules.endgame import ENDGAME_LAYOUTS, WINNING_SIDES_RANGES
from modules.json import json_load
from modules.requests.configuration import Configuration
from modules.requests.move import MoveData
from modules.server.auxiliary import refresh
from modules.server.endgame import EndgameStudySingleton
from modules.server.status_server import StatusServer
from modules.structures.review import Review

configuration = load_configuration()
INPUT_PGN_FILE = configuration["paths"]["input_pgn"]
LOG_FILE = configuration["paths"]["log"]
PORT = configuration["server"]["port"]
OPEN_BROWSER = configuration["server"]["open_browser"]

logging.basicConfig(filename=LOG_FILE, level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()
status_server = StatusServer()
app.mount("/chess", StaticFiles(directory="static", html=True), name="html")
app.mount("/json", StaticFiles(directory="json", html=False), name="json")
app.mount("/reviews", StaticFiles(directory="reviews", html=False), name="reviews")
app.mount("/tactics", StaticFiles(directory="tactics", html=False), name="tactics")


@app.exception_handler(StarletteHTTPException)
async def custom_404_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return HTMLResponse(
            content=DEFAULT_ERROR_MESSAGE.format(
                code=404, message="Not Found", explain="The requested resource could not be found."
            ),
            status_code=404,
        )
    return await request.app.default_exception_handler(request, exc)


@app.get("/")
async def root():
    return RedirectResponse(url="/chess/")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse("static/img/chesspieces/wikipedia/wB.png")


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
    dtz = data.get("dtz")
    white = data.get("white")
    bishop_color = data.get("bishop_color")
    side_pieces = data.get("side_pieces")
    if layout is not None and (dtm is not None or dtz is not None):
        try:
            game_info = endgame_study.start_game(layout, dtm, dtz, white, bishop_color, side_pieces)
            return JSONResponse(game_info.__dict__)
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
    print(data)
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


@app.get("/endgame/layouts_definitions")
async def endgame_layouts_definitions() -> JSONResponse:
    return JSONResponse(
        {
            "layouts": ENDGAME_LAYOUTS,
            "ranges": WINNING_SIDES_RANGES,
        }
    )


@app.post("/endgame/generate")
async def endgame_generate(request: Request):
    logger.info("Generating endgame positions...")
    data = await request.json()
    layout = data.get("layout")
    if layout is None:
        raise HTTPException(status_code=400, detail="No layout provided")

    run_script("endgame", layout)
    return PlainTextResponse("Generation started.")


async def analyze_mode(request: Request, mode: str):
    logger.info("Analyzing...")
    pgn = await request.body()

    input_pgn_file = os.path.normpath(INPUT_PGN_FILE)
    with open(INPUT_PGN_FILE, "w") as file:
        file.write(pgn.decode("utf-8"))

    run_script(mode, input_pgn_file)
    return PlainTextResponse("Analysis started.")
