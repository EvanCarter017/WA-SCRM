@echo off
chcp 65001 >nul
set "NODE_BIN=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_BIN%" set "NODE_BIN=node"
echo 正在启动 WA Desk SCRM 客户全生命周期原型预览服务 (http://127.0.0.1:56141/#lifecycle) ...
start "" "http://127.0.0.1:56141/#lifecycle"
"%NODE_BIN%" "%~dp0work\wa-replica\serve.cjs" 56141 "%~dp0outputs\review-prompts"
pause
