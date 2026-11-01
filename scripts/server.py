#!/usr/bin/env python3
"""Manage a detached, per-port LAN server for the game (Python standard library)."""
import argparse
import fcntl
import functools
import http.client
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
RUN = ROOT / '.run'
ASSETS = {'index.html', 'style.css', 'game.js', 'music.js', 'stages.js'}


def port_number(value):
    try:
        port = int(value)
    except ValueError:
        raise argparse.ArgumentTypeError('포트는 1~65535 정수여야 합니다.') from None
    if not 1 <= port <= 65535:
        raise argparse.ArgumentTypeError('포트는 1~65535 정수여야 합니다.')
    return port


def owned_process(state):
    """Check the launch token before signaling a PID that may have been reused."""
    if not state:
        return False
    result = subprocess.run(['ps', '-p', str(state['pid']), '-o', 'args='],
                            capture_output=True, text=True, check=False)
    return (result.returncode == 0 and state['token'] in result.stdout
            and str(Path(__file__).resolve()) in result.stdout)


def healthy(port, token):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=.3)
    try:
        connection.request('HEAD', '/')
        response = connection.getresponse()
        return response.status == 200 and response.getheader('X-Cavern-Instance') == token
    except (OSError, http.client.HTTPException):
        return False
    finally:
        connection.close()


def serve(port, token):
    class Handler(SimpleHTTPRequestHandler):
        def send_head(self):
            name = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
            if name not in ASSETS:
                self.send_error(404)
                return None
            self.path = '/' + name
            return super().send_head()

        def end_headers(self):
            self.send_header('X-Cavern-Instance', token)
            self.send_header('Cache-Control', 'no-cache')
            super().end_headers()

    handler = functools.partial(Handler, directory=str(ROOT))
    with ThreadingHTTPServer(('0.0.0.0', port), handler) as server:
        print(f'Listening on 0.0.0.0:{port}', flush=True)
        server.serve_forever()


def manage(action, port):
    RUN.mkdir(exist_ok=True)
    state_path = RUN / f'server-{port}.json'
    log_path = RUN / f'server-{port}.log'
    # Separate lock files remain in place so simultaneous commands share one lock.
    with (RUN / f'server-{port}.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            state = json.loads(state_path.read_text())
            if not isinstance(state.get('pid'), int) or not state.get('token'):
                state = None
        except (OSError, ValueError, AttributeError):
            state = None
        running = owned_process(state)
        if not running:
            state_path.unlink(missing_ok=True)
        if action == 'status':
            if running:
                ready = healthy(port, state['token'])
                print(f'{"RUNNING" if ready else "UNHEALTHY"} 0.0.0.0:{port} (PID {state["pid"]})')
                return 0 if ready else 1
            print(f'STOPPED port {port}')
            return 3
        if action == 'stop':
            if not running:
                print(f'이미 중지되어 있습니다. port {port}')
                return 0
            try:
                os.kill(state['pid'], signal.SIGTERM)
            except ProcessLookupError:
                state_path.unlink(missing_ok=True)
                print(f'STOPPED port {port}')
                return 0
            for _ in range(50):
                if not owned_process(state):
                    state_path.unlink(missing_ok=True)
                    print(f'STOPPED port {port}')
                    return 0
                time.sleep(.1)
            print('종료를 확인하지 못했습니다. status와 로그를 확인하세요.', file=sys.stderr)
            return 1
        if running:
            print(f'이미 실행 중입니다. http://localhost:{port} (PID {state["pid"]})')
            return 0 if healthy(port, state['token']) else 1
        token = secrets.token_hex(16)
        with log_path.open('ab') as log:
            child = subprocess.Popen([sys.executable, str(Path(__file__).resolve()),
                                      '--serve', str(port), token], cwd=ROOT,
                                     stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                     start_new_session=True)
        state = {'pid': child.pid, 'port': port, 'token': token}
        try:
            for _ in range(60):
                if child.poll() is not None:
                    break
                if healthy(port, token):
                    state_path.write_text(json.dumps(state))
                    print(f'STARTED 0.0.0.0:{port} (PID {child.pid})\n'
                          f'이 PC: http://localhost:{port}\n'
                          f'다른 기기: http://<이 PC의 LAN IP>:{port}\n로그: {log_path}')
                    return 0
                time.sleep(.1)
        finally:
            if not state_path.exists() and child.poll() is None:
                child.terminate()
                child.wait(timeout=5)
        print(f'시작 실패: 포트 {port} 사용 여부와 로그를 확인하세요.\n{log_path}', file=sys.stderr)
        return 1


def main():
    if len(sys.argv) == 4 and sys.argv[1] == '--serve':
        serve(port_number(sys.argv[2]), sys.argv[3])
        return 0
    parser = argparse.ArgumentParser(description='Bubble Bobble LAN 서버 (0.0.0.0)')
    parser.add_argument('action', choices=['start', 'stop', 'status'])
    parser.add_argument('port', nargs='?', type=port_number)
    parser.add_argument('-p', '--port', dest='port_option', type=port_number)
    args = parser.parse_args()
    if args.port is not None and args.port_option is not None:
        parser.error('포트는 위치 인자 또는 --port 중 하나로만 지정하세요.')
    port = args.port if args.port is not None else args.port_option
    return manage(args.action, 4173 if port is None else port)


if __name__ == '__main__':
    sys.exit(main())
