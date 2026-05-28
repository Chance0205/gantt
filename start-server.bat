@echo off
start "Gantt Server" /min python "%~dp0output\save-server.py"
echo Server started on port 9741.
echo Open: http://127.0.0.1:9741/mr-v2.html
pause
