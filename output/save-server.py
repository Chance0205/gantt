#!/usr/bin/env python3
"""
Gantt Chart 로컬 저장 서버  (자동 git push 포함)
사용법:  python save-server.py
접속:    http://localhost:8080/mr-v2.html
"""
import io
import json
import os
import subprocess
import sys
import threading
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ── stdout/stderr UTF-8 (Windows CMD cp1252 인코딩 오류 방지) ─────────
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
else:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def _log(*args):
    """print wrapper — 어떤 상황에서도 서버를 죽이지 않음."""
    try:
        print(*args, flush=True)
    except Exception:
        pass

# ── Windows CMD 창 억제 ───────────────────────────────────────────────
_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0

if sys.platform == "win32":
    _STARTUP = subprocess.STARTUPINFO()
    _STARTUP.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    _STARTUP.wShowWindow = 0  # SW_HIDE
else:
    _STARTUP = None

# git이 자격증명 창을 띄우지 않도록
_GIT_ENV = {**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GCM_INTERACTIVE': 'never'}

def _run(*args, **kwargs):
    """subprocess.run wrapper -- CMD 창 없음, git UI 프롬프트 없음."""
    return subprocess.run(
        *args,
        creationflags=_NO_WINDOW,
        startupinfo=_STARTUP,
        env=_GIT_ENV,
        **kwargs,
    )

# ── 설정 ──────────────────────────────────────────────────────────────
PORT       = 8080
AUTO_PUSH  = True
PUSH_DELAY = 10     # 마지막 저장 후 몇 초 뒤에 git push 실행
# ──────────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT  = os.path.dirname(SCRIPT_DIR)

_push_timer = None
_push_lock  = threading.Lock()


# ── Git 자동 푸시 ─────────────────────────────────────────────────────

def _do_push(filename):
    rel_path = os.path.join('output', filename)
    ts = time.strftime('%Y-%m-%d %H:%M')
    try:
        _run(['git', '-C', REPO_ROOT, 'add', rel_path],
             capture_output=True, check=True, timeout=15)

        result = _run(
            ['git', '-C', REPO_ROOT,
             '-c', 'gpg.format=openpgp',
             '-c', 'commit.gpgsign=false',
             'commit', '-m', f'Auto-save {ts}'],
            capture_output=True, text=True, timeout=15,
        )
        combined = (result.stdout + result.stderr).lower()
        if 'nothing to commit' in combined or 'nothing added' in combined:
            _log('  -  변경 없음 (커밋 스킵)')
            return
        if result.returncode != 0:
            _log(f'  !  커밋 실패: {result.stderr.strip()}')
            return

        branch = _run(
            ['git', '-C', REPO_ROOT, 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True, text=True,
        ).stdout.strip() or 'main'
        push = _run(
            ['git', '-C', REPO_ROOT, 'push', '--set-upstream', 'origin', branch],
            capture_output=True, text=True, timeout=60,
        )
        if push.returncode == 0:
            _log(f'  ^  GitHub push OK  {ts}')
        else:
            _log(f'  !  push failed: {push.stderr.strip()}')

    except subprocess.TimeoutExpired:
        _log('  !  Git timeout')
    except Exception as e:
        _log(f'  !  Git error: {e}')


def schedule_push(filename):
    global _push_timer
    with _push_lock:
        if _push_timer:
            _push_timer.cancel()
        _push_timer = threading.Timer(PUSH_DELAY, _do_push, args=[filename])
        _push_timer.daemon = True
        _push_timer.start()
    _log(f'  ...  push in {PUSH_DELAY}s')


# ── HTTP 핸들러 ───────────────────────────────────────────────────────

class GanttHandler(SimpleHTTPRequestHandler):

    def do_GET(self):
        if self.path == '/ping':
            resp = b'{"ok":true}'
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(resp)))
            self.end_headers()
            self.wfile.write(resp)
            return
        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        # _handle_save returns (status, bytes); response is ALWAYS sent
        status, body_bytes = 500, b'{"ok":false}'
        try:
            status, body_bytes = self._handle_save()
        except Exception as e:
            body_bytes = json.dumps({'ok': False, 'error': str(e)}).encode()
            _log(f'  !  handler error: {e}')

        try:
            self.send_response(status)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body_bytes)))
            self.end_headers()
            self.wfile.write(body_bytes)
        except Exception:
            pass

    def _handle_save(self):
        """Return (status_code, response_bytes)."""
        if not self.path.startswith('/save'):
            return 404, b'{"ok":false,"error":"not found"}'

        qs = parse_qs(urlparse(self.path).query)
        filename = qs.get('file', ['gantt-save.json'])[0]

        if ('/' in filename or '\\' in filename or
                '..' in filename or not filename.endswith('.json')):
            return 400, b'{"ok":false,"error":"invalid filename"}'

        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)

        with open(filename, 'wb') as f:
            f.write(body)

        try:
            data = json.loads(body)
            saved_at   = data.get('savedAt', '')[:19].replace('T', ' ')
            item_count = len(data.get('items', []))
            _log(f'  [SAVE]  {filename}  {item_count} items  {saved_at}')
        except Exception:
            _log(f'  [SAVE]  {filename}  ({len(body):,} bytes)')

        if AUTO_PUSH:
            schedule_push(filename)

        return 200, json.dumps({'ok': True}).encode()

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        if args and str(args[0]).startswith('GET') and '/ping' not in str(args[0]):
            return
        super().log_message(fmt, *args)


# ── 진입점 ───────────────────────────────────────────────────────────

if __name__ == '__main__':
    os.chdir(SCRIPT_DIR)

    git_ok  = _run(['git', '--version'], capture_output=True).returncode == 0
    repo_ok = os.path.isdir(os.path.join(REPO_ROOT, '.git'))

    push_st = 'ON' if (AUTO_PUSH and git_ok and repo_ok) else (
        'NO GIT'  if not git_ok  else
        'NO REPO' if not repo_ok else
        'OFF'
    )

    try:
        httpd = HTTPServer(('localhost', PORT), GanttHandler)
    except OSError as e:
        _log(f'  [ERROR] Port {PORT} is already in use: {e}')
        _log(f'  [ERROR] 이미 서버가 실행 중이거나 다른 프로그램이 {PORT}번 포트를 사용 중입니다.')
        _log(f'  [ERROR] 작업 표시줄에서 "Gantt Server" 창을 닫고 다시 시도하세요.')
        input('  Press Enter to exit...')
        sys.exit(1)

    _log(f'  Gantt save-server  http://localhost:{PORT}/mr-v2.html')
    _log(f'  git push: {push_st}  (delay {PUSH_DELAY}s)  |  Ctrl+C to stop')

    if AUTO_PUSH and not git_ok:
        _log('  [WARN] git not found.')
    if AUTO_PUSH and not repo_ok:
        _log(f'  [WARN] not a git repo: {REPO_ROOT}')

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        _log('server stopped.')
        sys.exit(0)
