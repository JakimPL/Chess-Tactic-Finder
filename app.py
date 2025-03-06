import logging
import os
import platform
import subprocess
import urllib.parse

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from modules.configuration import load_configuration, save_configuration
from modules.json import json_load
from modules.server.auxiliary import refresh
from modules.server.endgame import EndgameStudySingleton
from modules.server.run import run_windows, run_linux
from modules.server.status_server import StatusServer
from modules.structures.review import Review

app = FastAPI()

configuration = load_configuration()
INPUT_PGN_FILE = configuration['paths']['input_pgn']
LOG_FILE = configuration['paths']['log']
PORT = configuration['server']['port']

logging.basicConfig(filename=LOG_FILE, level=logging.DEBUG)
logger = logging.getLogger('handler')

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


app.mount("/chess", StaticFiles(directory='static', html=True), name='html')
app.mount("/json", StaticFiles(directory='json', html=False), name='json')
app.mount("/reviews", StaticFiles(directory='reviews', html=False), name='reviews')
app.mount("/tactics", StaticFiles(directory='tactics', html=False), name='tactics')


class Configuration(BaseModel):
    paths: dict


class MoveData(BaseModel):
    fen: str
    move: str
    beta: float


@app.get("/configuration.json")
async def get_configuration():
    return FileResponse('configuration.json')


@app.get("/refresh")
async def refresh_endpoint(gather: bool = False):
    refresh(logger.info, gather_games=gather)
    return PlainTextResponse("Refreshed.")


@app.get("/analysis_state")
async def analysis_state():
    return JSONResponse({"error": "Not implemented yet"})
    message = StatusServer.message
    dictionary = dict(urllib.parse.parse_qsl(message))
    return JSONResponse(dictionary)


@app.get("/reinstall")
async def reinstall():
    logger.info('Reinstalling...')
    if platform.system() == 'Windows':
        result = subprocess.run(
            [os.path.join('shell', 'bat', 'install.bat')],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    elif platform.system() == 'Linux':
        path = os.path.join('shell', 'sh', 'install.sh')
        result = subprocess.run(
            [path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    else:
        raise HTTPException(status_code=501, detail=f'Platform {platform.system()} is not supported')

    return PlainTextResponse(result.stdout.decode())


@app.post("/analyze")
async def analyze(request: Request):
    return await analyze_mode(request, 'analyze')


@app.post("/review")
async def review(request: Request):
    return await analyze_mode(request, 'review')


@app.post("/reviewer/get_chart")
async def get_chart(request: Request):
    data = await request.body()
    path = data.decode('utf-8')[1:]
    dictionary = json_load(path)
    review = Review.from_json(dictionary)
    graph_data = review.plot_evaluations()
    return PlainTextResponse(graph_data)


@app.post("/save_configuration")
async def save_configuration_endpoint(config: Configuration):
    logger.info('Saving configuration...')
    save_configuration(config.dict())
    return PlainTextResponse("Configuration saved.")


@app.post("/endgame/start")
async def endgame_start(data: dict):
    endgame_study = EndgameStudySingleton().get_instance()
    layout = data.get('layout')
    dtm = data.get('dtm')
    white = data.get('white')
    bishop_color = data.get('bishop_color')
    if layout is not None and dtm is not None:
        try:
            fen = endgame_study.start_game(layout, dtm, white, bishop_color)
            return JSONResponse({'fen': fen})
        except ValueError:
            raise HTTPException(status_code=400, detail='No position matching the criteria')
    else:
        raise HTTPException(status_code=400, detail='Required parameters not provided')


@app.post("/endgame/move")
async def endgame_move(data: MoveData):
    endgame_study = EndgameStudySingleton().get_instance()
    reply = endgame_study.move(data.fen, data.move, data.beta)
    return JSONResponse(reply.__dict__)


async def analyze_mode(request: Request, mode: str):
    logger.info('Analyzing...')
    pgn = await request.body()
    with open(INPUT_PGN_FILE, 'w') as file:
        file.write(pgn.decode('utf-8'))

    if platform.system() == 'Windows':
        path = os.path.join('shell', 'bat', 'analyze.bat')
        command = f'{path} {mode}.py {INPUT_PGN_FILE}'
        run_windows(command)
    elif platform.system() == 'Linux':
        path = os.path.join('shell', 'sh', 'analyze.sh')
        command = f'{path} {mode}.py {INPUT_PGN_FILE}'
        run_linux(command)
    else:
        raise HTTPException(status_code=501, detail=f'Platform {platform.system()} is not supported')

    return PlainTextResponse("Analysis started.")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT)
