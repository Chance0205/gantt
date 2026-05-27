#!/usr/bin/env python3
"""
Gantt Chart 로컬 저장 서버  (자동 git push 포함)
────────────────────────────────────────────────
사용법:  python save-server.py
접속:    http://localhost:8080/mr-v2.html

동작:
  1. 브라우저에서 변경 → 1.5초 후 .json 파일에 자동 저장
  2. 저장 후 10초 대기 → GitHub에 자동 커밋 + 푸시

설정 (아래 상수로 조정):
  AUTO_PUSH  = True   ← False 로 바꾸면 git push 안 함
  PUSH_DELAY = 10     ← 마지막 저장 후 몇 초 뒤에 push할지
────────────────────────────────────────────────
"""
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import subprocess
import sys
import threading
import time

# ── 설정 ──────────────────────────────────────────────────────────────
PORT       = 8080
AUTO_PUSH  = True   # False 로 바꾸면 파일 저장만 (git push 없음)
PUSH_DELAY = 10     # 마지막 저장 후 몇 초 뒤에 git push 실행
# ──────────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))  # .../output/
REPO_ROOT  = os.path.dirname(SCRIPT_DIR)                 # 상위 폴더 = git repo root

_push_timer = None
_push_lock  = threading.Lock()


# ── Git 자동 푸시 ─────────────────────────────────────────────────────

def _do_push(filename):
    """백그라운드 스레드에서 git add → commit → push 실행."""
    rel_path = os.path.join('output', filename)
    ts = time.strftime('%Y-%m-%d %H:%M')
    try:
        # git add
        subprocess.run(
            ['git', '-C', REPO_ROOT, 'add', rel_path],
            capture_output=True, check=True, timeout=15
        )

        # git commit
        result = subprocess.run(
            ['git', '-C', REPO_ROOT,
             '-c', 'gpg.format=openpgp',
             '-c', 'commit.gpgsign=false',
             'commit', '-m', f'Auto-save {ts}'],
            capture_output=True, text=True, timeout=15
        )
        combined = (result.stdout + result.stderr).lower()
        if 'nothing to commit' in combined or 'nothing added' in combined:
            print('  ─  변경 없음 (커밋 스킵)')
            return
        if result.returncode != 0:
            print(f'  ✗  커밋 실패: {result.stderr.strip()}')
            return

        # git push
        push = subprocess.run(
            ['git', '-C', REPO_ROOT, 'push'],
            capture_output=True, text=True, timeout=60
        )
        if push.returncode == 0:
            print(f'  ↑  GitHub 푸시 완료  ·  {ts}')
        else:
            print(f'  ✗  푸시 실패\n     {push.stderr.strip()}')

    except subprocess.TimeoutExpired:
        print('  ✗  Git 작업 시간 초과')
    except Exception as e:
        print(f'  ✗  Git 오류: {e}')


def schedule_push(filename):
    """마지막 저장으로부터 PUSH_DELAY초 뒤에 push — 연속 저장 시 디바운스."""
    global _push_timer
    with _push_lock:
        if _push_timer:
            _push_timer.cancel()
        _push_timer = threading.Timer(PUSH_DELAY, _do_push, args=[filename])
        _push_timer.daemon = True
        _push_timer.start()
    print(f'  ⏳  {PUSH_DELAY}초 후 GitHub 자동 푸시 예정…')


# ── HTTP 핸들러 ───────────────────────────────────────────────────────

class GanttHandler(SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if not self.path.startswith('/save'):
            self.send_error(404)
            return

        # 파일명 추출: /save?file=xxx.json
        qs = parse_qs(urlparse(self.path).query)
        filename = qs.get('file', ['gantt-save.json'])[0]

        # 보안: 현재 디렉토리의 .json 파일만 허용
        if os.sep in filename or '..' in filename or not filename.endswith('.json'):
            self.send_error(400, 'Invalid filename')
            return

        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)

        with open(filename, 'wb') as f:
            f.write(body)

        # 저장 로그
        try:
            data = json.loads(body)
            saved_at   = data.get('savedAt', '')[:19].replace('T', ' ')
            item_count = len(data.get('items', []))
            print(f'  💾  {filename}  ·  {item_count} items  ·  {saved_at}')
        except Exception:
            print(f'  💾  {filename}  ({len(body):,} bytes)')

        # 자동 푸시 예약
        if AUTO_PUSH:
            schedule_push(filename)

        resp = json.dumps({'ok': True}).encode()
        self.send_response(200)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        if args and str(args[0]).startswith('GET'):
            return  # GET 로그 숨김
        super().log_message(fmt, *args)


# ── 진입점 ───────────────────────────────────────────────────────────

if __name__ == '__main__':
    os.chdir(SCRIPT_DIR)

    # git 설치 여부 확인
    git_ok = subprocess.run(['git', '--version'], capture_output=True).returncode == 0
    # git repo 여부 확인
    repo_ok = os.path.isdir(os.path.join(REPO_ROOT, '.git'))

    push_status = '✅  활성화' if (AUTO_PUSH and git_ok and repo_ok) else (
        '⚠️  git 없음' if not git_ok else
        '⚠️  git repo 아님' if not repo_ok else
        '⏸  비활성화 (AUTO_PUSH=False)'
    )

    httpd = HTTPServer(('localhost', PORT), GanttHandler)

    print()
    print('┌──────────────────────────────────────────────────┐')
    print('│  🚀  Gantt 저장 서버 실행 중                      │')
    print(f'│  브라우저:    http://localhost:{PORT}/mr-v2.html      │')
    print(f'│  자동 저장:   변경 후 1.5초                       │')
    print(f'│  GitHub 푸시: {PUSH_DELAY}초 디바운스  {push_status}  │')
    print('│  중지:        Ctrl+C                             │')
    print('└──────────────────────────────────────────────────┘')
    print()

    if AUTO_PUSH and not git_ok:
        print('  ⚠️  git 명령을 찾을 수 없습니다. Git을 설치하거나 PATH를 확인하세요.')
    if AUTO_PUSH and not repo_ok:
        print(f'  ⚠️  git repo를 찾을 수 없습니다: {REPO_ROOT}')
    print()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n서버 중지.')
        sys.exit(0)
