import os
import subprocess
import platform
import http.server
import urllib.parse
from modules.configuration import load_configuration

from modules.server.auxiliary import refresh, get_value, save_progress

configuration = load_configuration()
INPUT_PGN_FILE = configuration['paths']['input_pgn']


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == '/refresh':
            refresh(self.log_message)
            self.log_message('Refreshed.')
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET')
            self.send_header('Content-Length', '9')
            self.end_headers()

            self.wfile.write(bytes('Refreshed', 'utf-8'))
        elif parsed_url.path == '/reinstall':
            self.log_message('Reinstalling...')
            if platform.system() == 'Windows':
                result = subprocess.run(
                    [os.path.join('shell', 'bat', 'install.bat')],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
            elif platform.system() == 'Linux':
                result = subprocess.run(
                    [os.path.join('shell', 'sh', 'install.sh')],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
            else:
                raise NotImplementedError(f'Platform {platform.system()} is not supported')

            result = result.stdout.decode()
            self.log_message(result)

            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET')
            self.send_header('Content-Length', str(len(result)))
            self.end_headers()

            self.wfile.write(bytes(result, 'utf-8'))
        elif 'save' in parsed_url.path:
            puzzle_id, value = parsed_url.path.split('/')[-2:]
            value = get_value(value)
            result = str(save_progress(self.log_message, puzzle_id, value))

            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET')
            self.send_header('Content-Length', str(len(result)))
            self.end_headers()

            self.wfile.write(bytes(result, 'utf-8'))
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
                command = f'cmd /c {path} {INPUT_PGN_FILE}'
                os.system(f'start /wait {command}')
            elif platform.system() == 'Linux':
                path = os.path.join('shell', 'sh', 'analyze.sh')
                command = f'bash {path} {INPUT_PGN_FILE}'
                os.system(f'gnome-terminal -- {command}')
            else:
                raise NotImplementedError(f'Platform {platform.system()} is not supported')

            result = 'Analyzed'
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET')
            self.send_header('Content-Length', str(len(result)))
            self.end_headers()

            self.wfile.write(bytes(result, 'utf-8'))
