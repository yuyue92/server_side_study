#!/bin/bash
echo "================================================"
echo "  Go API Generator"
echo "================================================"
echo ""

# Check Go
if ! command -v go &> /dev/null; then
    echo "[错误] 未检测到 Go 环境，请先安装 Go 1.21+"
    exit 1
fi

CONFIG="${1:-examples/schema.json}"
OUTPUT="${2:-output}"
MODULE="${3:-generated-api}"

echo "配置文件: $CONFIG"
echo "输出目录: $OUTPUT"
echo "模块名称: $MODULE"
echo ""

go run main.go -config "$CONFIG" -output "$OUTPUT" -mod "$MODULE"

if [ $? -ne 0 ]; then
    echo "[错误] 代码生成失败！"
    exit 1
fi

echo ""
echo "安装依赖..."
cd "$OUTPUT" && go mod tidy

echo ""
echo "启动服务..."
go run main.go
