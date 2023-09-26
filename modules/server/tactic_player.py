import subprocess
import platform
import http.server
import urllib.parse

from modules.server.auxiliary import refresh, get_value, save_progress


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
        elif parsed_url.path == 'reinstall':
            if platform.system() == 'Windows':
                subprocess.run(['run.bat'])
            elif platform.system() == 'Linux':
                subprocess.run(['./run.sh'])
            else:
                raise NotImplementedError(f'Platform {platform.system()} is not supported')
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
