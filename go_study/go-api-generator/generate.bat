@echo off
chcp 65001 >nul 2>&1
echo ================================================
echo   Go API Generator - 仅生成代码
echo ================================================
echo.

where go >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Go 环境
    pause
    exit /b 1
)

:: 可自定义以下参数
set CONFIG=examples\schema.json
set OUTPUT=output
set MODULE=generated-api

echo 配置文件: %CONFIG%
echo 输出目录: %OUTPUT%
echo 模块名称: %MODULE%
echo.

go run main.go -config %CONFIG% -output %OUTPUT% -mod %MODULE%

echo.
echo 生成完成！请执行以下命令启动服务:
echo   cd %OUTPUT%
echo   go mod tidy
echo   go run main.go
echo.
pause
