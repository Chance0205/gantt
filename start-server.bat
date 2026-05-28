@echo off
cd /d "%~dp0output"
start /b pythonw save-server.py
echo 서버 시작됨 (백그라운드 실행 중)
echo 종료하려면 작업 관리자에서 pythonw.exe 프로세스 종료
pause
