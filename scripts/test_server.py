"""Integration tests using real subprocesses and HTTP sockets."""
import http.client
import json
from pathlib import Path
import socket
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / 'server.sh'


def command(*args, code=0):
    result = subprocess.run([str(SCRIPT), *map(str, args)], cwd=tempfile.gettempdir(),
                            capture_output=True, text=True, timeout=15)
    assert result.returncode == code, (args, result.returncode, result.stdout, result.stderr)
    return result.stdout


def get(port, path):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=2)
    try:
        connection.request('GET', path)
        response = connection.getresponse()
        return response.status, response.read()
    finally:
        connection.close()


with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0))
    port = probe.getsockname()[1]
try:
    assert 'STOPPED' in command('status', port, code=3)
    assert 'STARTED' in command('start', '--port', port)
    state_file = ROOT / '.run' / f'server-{port}.json'
    state = json.loads(state_file.read_text())
    command('start', '-p', port)
    assert json.loads(state_file.read_text()) == state, 'duplicate start changed PID'
    assert 'RUNNING' in command('status', port)
    status, body = get(port, '/')
    assert status == 200 and b'Bubble Bobble' in body
    assert get(port, '/music.js')[0] == 200
    assert get(port, '/.run/')[0] == 404
    assert get(port, '/../README.md')[0] == 404
    listeners = subprocess.check_output(['lsof', '-nP', '-a', '-p', str(state['pid']),
                                         '-iTCP', '-sTCP:LISTEN'], text=True)
    assert f'*:{port} (LISTEN)' in listeners, listeners
    command('stop', port)
    command('status', port, code=3)
    command('stop', port)
    # An occupied port must remain untouched, not be mistaken for our own server.
    with socket.socket() as occupied:
        occupied.bind(('0.0.0.0', 0))
        occupied.listen()
        command('start', occupied.getsockname()[1], code=1)
        assert not state_file.exists()
    # Stale PID metadata must never kill an unrelated live process.
    with subprocess.Popen(['sleep', '30']) as unrelated:
        state_file.write_text(json.dumps({'pid': unrelated.pid, 'token': 'not-our-server'}))
        command('stop', port)
        assert unrelated.poll() is None
        unrelated.terminate()
    command('start', port)
    command('stop', port)
    for bad in ('0', '65536', 'abc', '-1'):
        command('start', '--port', bad, code=2)
    command('start', port, '--port', port, code=2)
    print('PASS: start/status/stop, alternate cwd, port flags, duplicate start, HTTP assets, '
          '0.0.0.0 listener, occupied port, stale PID safety, restart, invalid input')
finally:
    command('stop', port)
