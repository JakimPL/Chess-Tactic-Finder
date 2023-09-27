import http.server
import json
import logging
import os
import platform
import subprocess
import urllib.parse

from modules.configuration import load_configuration, save_configuration
from modules.server.auxiliary import refresh, get_value, save_progress
from modules.server.run import run_windows, run_linux

configuration = load_configuration()
INPUT_PGN_FILE = configuration['paths']['input_pgn']
LOG_FILE = configuration['paths']['log']

logger = logging.getLogger('handler')
logger.setLevel(logging.DEBUG)
file_handler = logging.FileHandler(LOG_FILE)
file_handler.setLevel(logging.DEBUG)
logger.addHandler(file_handler)
logger.addHandler(logging.StreamHandler())

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
        <p>Error code: %(code)d</p>
        <p>Message: %(message)s.</p>
        <p>Error code explanation: %(code)s - %(explain)s.</p>
        <footer>
            <a href="https://github.com/JakimPL/Chess-Tactic-Finder/">Tactic Finder by Jakim (2023).</a>
        </footer>
    </body>
</html>
"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, request, client_address, server, **kwargs):
        self.error_message_format = DEFAULT_ERROR_MESSAGE
        super().__init__(request, client_address, server, **kwargs)

    def send_text(self, text: str):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Content-Length', str(text))
        self.end_headers()
        self.wfile.write(bytes(text, 'utf-8'))

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == '/refresh':
            refresh(self.log_message)
            text = 'Refreshed.'
            self.log_message(text)
            self.send_text(text)
        elif parsed_url.path == '/reinstall':
            self.log_message('Reinstalling...')
            if platform.system() == 'Windows':
                result = subprocess.run(
                    [os.path.join('shell', 'bat', 'install.bat')],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
            elif platform.system() == 'Linux':
                path = os.path.join('shell', 'sh', 'install.sh')
                run_windows(path)
                result = subprocess.run(
                    [os.path.join('shell', 'sh', 'install.sh')],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
            else:
                raise NotImplementedError(f'Platform {platform.system()} is not supported')

            result = result.stdout.decode()
            self.send_text(result)
        elif parsed_url.path.endswith(('.py', '.pyc', '.bat', '.sh', '.tactic', '.vars', '.md', '.txt')):
            self.send_error(404)
        elif 'save' in parsed_url.path:
            puzzle_id, value = parsed_url.path.split('/')[-2:]
            value = get_value(value)
            result = str(save_progress(self.log_message, puzzle_id, value))
            self.send_text(result)
        else:
            super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == '/analyze':
            self.log_message('Analyzing...')
            length = int(self.headers['Content-Length'])
            pgn = self.rfile.read(length).decode('utf-8')

            with open(INPUT_PGN_FILE, 'w') as file:
                file.write(pgn)

            if platform.system() == 'Windows':
                path = os.path.join('shell', 'bat', 'analyze.bat')
                command = f'{path} {INPUT_PGN_FILE}'
                run_windows(command)

            elif platform.system() == 'Linux':
                path = os.path.join('shell', 'sh', 'analyze.sh')
                command = f'{path} {INPUT_PGN_FILE}'
                run_linux(command)

            else:
                raise NotImplementedError(f'Platform {platform.system()} is not supported')

            result = 'Analysis started.'
            self.send_text(result)
        elif parsed_url.path == '/save_configuration':
            self.log_message('Saving configuration...')
            length = int(self.headers['Content-Length'])
            config = json.loads(self.rfile.read(length).decode('utf-8'))
            save_configuration(config)
            result = 'Configuration saved.'
            self.send_text(result)

    def list_directory(self, path):
        self.send_error(404)

    def log_message(self, format, *args):
        message = format % args
        logger.info(
            "%s - - [%s] %s" % (
                self.address_string(),
                self.log_date_time_string(),
                message
            )
        )
