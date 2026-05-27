#!/usr/bin/env python3
"""
Gantt Chart 로컬 저장 서버
────────────────────────────────────────
사용법:  python save-server.py
접속:    http://localhost:8080/mr-v2.html

Gantt 차트에서 변경이 있으면 1.5초 후 자동으로
같은 폴더에 .json 파일로 저장됩니다.

저장 파일: mr-v2-gantt-state-v1.json
────────────────────────────────────────
"""
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import sys

PORT = 8080


class GanttHandler(SimpleHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
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
            saved_at = data.get('savedAt', '')[:19].replace('T', ' ')
            item_count = len(data.get('items', []))
            print(f'  💾  {filename}  ·  {item_count} items  ·  {saved_at}')
        except Exception:
            print(f'  💾  {filename}  ({len(body):,} bytes)')

        resp = json.dumps({'ok': True}).encode()
        self.send_response(200)
        self._cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, fmt, *args):
        # GET 요청 로그 숨김 (너무 많아서)
        if args and str(args[0]).startswith('GET'):
            return
        super().log_message(fmt, *args)


if __name__ == '__main__':
    # 스크립트 위치를 기준으로 작업 디렉토리 설정
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    httpd = HTTPServer(('localhost', PORT), GanttHandler)

    print()
    print('┌─────────────────────────────────────────┐')
    print('│  🚀  Gantt 저장 서버 실행 중             │')
    print(f'│  브라우저: http://localhost:{PORT}/mr-v2.html  │')
    print(f'│  저장 위치: {script_dir[:28]}  │')
    print('│  중지: Ctrl+C                           │')
    print('└─────────────────────────────────────────┘')
    print()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n서버 중지.')
        sys.exit(0)
