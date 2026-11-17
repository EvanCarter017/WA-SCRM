@echo off
chcp 65001 >nul
set "NODE_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_BIN%" set "NODE_BIN=node"
"%NODE_BIN%" "%~dp0work\wa-replica\build-fidelity.cjs"
"%NODE_BIN%" "%~dp0work\wa-replica\validate-scrm-lifecycle.cjs"
pause
