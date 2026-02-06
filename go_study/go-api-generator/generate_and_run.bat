@echo off
chcp 65001 >nul 2>&1
echo ================================================
echo   Go API Generator - Windows 启动脚本
echo ================================================
echo.

:: 检查 Go 是否安装
where go >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Go 环境，请先安装 Go 1.21+
    echo 下载地址: https://go.dev/dl/
    pause
    exit /b 1
)

:: 设置参数（可修改）
set CONFIG=examples\schema.json
set OUTPUT=output
set MODULE=generated-api

echo [1/3] 正在解析配置并生成代码...
go run main.go -config %CONFIG% -output %OUTPUT% -mod %MODULE%
if %errorlevel% neq 0 (
    echo [错误] 代码生成失败！
    pause
    exit /b 1
)

echo.
echo [2/3] 正在安装依赖 (go mod tidy)...
cd %OUTPUT%
go mod tidy
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败！
    pause
    exit /b 1
)

echo.
echo [3/3] 正在启动服务...
echo ================================================
echo   服务地址: http://localhost:8080
echo   健康检查: http://localhost:8080/health
echo   API路径:  http://localhost:8080/api/v1
echo   按 Ctrl+C 停止服务
echo ================================================
go run main.go

pause
