package main

import (
	"fmt"
	"log"
	"net/http"
)

// 处理器函数 - 处理HTTP请求
func helloHandler(w http.ResponseWriter, r *http.Request) {
	// w: ResponseWriter - 用于写入响应
	// r: Request - 包含请求信息
	fmt.Fprintf(w, "Hello, World! 这是你的第一个Go HTTP服务")

}

func main() {
	// 注册路由和处理器
	// "/" 表示根路径
	http.HandleFunc("/", helloHandler)
	fmt.Println("服务器启动在: http://localhost:8084")

	// 启动服务器，监听8080端口
	// 如果启动失败，log.Fatal会打印错误并退出程序
	log.Fatal(http.ListenAndServe(":8084", nil))
}
