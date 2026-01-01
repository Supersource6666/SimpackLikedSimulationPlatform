@echo off
cd /d "%~dp0"
echo 正在安装依赖...
pip install -r requirements.txt

echo 依赖安装完成，正在启动服务器...
python main.py

pause
