import os
import socketserver
import threading
import webbrowser

from modules.configuration import load_configuration
from modules.server.auxiliary import refresh, save_progress
from modules.server.handler import Handler

configuration = load_configuration()

INPUT_DIRECTORY = configuration['paths']['output']
GATHERED_PUZZLES_PATH = configuration['paths']['gathered_puzzles']
PROGRESS_PATH = configuration['paths']['progress']
SOCKET_PATH = configuration['paths']['unix_socket']

PORT = configuration['tactic_player']['port']
HARD_PROGRESS = configuration['tactic_player']['hard_progress']
OPEN_BROWSER = configuration['tactic_player']['open_browser']
SOCKET = configuration['tactic_player']['socket']


def run(httpd):
    httpd.allow_reuse_address = True
    httpd.server_bind()
    httpd.server_activate()
    print(f'Server started at http://localhost:{PORT}')
    httpd.serve_forever()


if __name__ == '__main__':
    refresh()
    save_progress()
    if SOCKET:
        from socketserver import UnixStreamServer


        class UnixSocketHttpServer(UnixStreamServer):
            def get_request(self):
                request, client_address = super(UnixSocketHttpServer, self).get_request()
                return request, ['local', 0]


        try:
            if os.path.exists(SOCKET_PATH):
                os.remove(SOCKET_PATH)

            server = UnixSocketHttpServer(SOCKET_PATH, Handler)
            thread = threading.Thread(target=lambda: server.serve_forever(), daemon=True)
            thread.start()

            print(f'Server started at {SOCKET_PATH}')
            os.chmod(SOCKET_PATH, 0o777)

            thread.join()
        except KeyboardInterrupt:
            print('Exit.')
    else:
        try:
            with socketserver.TCPServer(('0.0.0.0', PORT), Handler, bind_and_activate=False) as httpd:
                thread = threading.Thread(target=lambda: run(httpd), daemon=True)
                thread.start()
                if OPEN_BROWSER:
                    webbrowser.open(f'http://localhost:{PORT}/index.html')

                thread.join()
        except KeyboardInterrupt:
            print('Exit.')
