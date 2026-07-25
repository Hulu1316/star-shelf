@echo off
set "APP=C:\Users\xiaos\WorkBuddy\2026-07-24-20-56-58\app"
set "PORT=3000"

REM 如果 3000 端口没有服务在跑，就在后台启动 node 服务（隐藏窗口）
powershell -NoProfile -Command "if(-not (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)){ Start-Process 'node' -ArgumentList 'server.js' -WorkingDirectory '%APP%' -WindowStyle Hidden }"

REM 等两秒让服务起来
timeout /t 2 >nul

REM 用默认浏览器打开应用
start "" "http://127.0.0.1:3000"
