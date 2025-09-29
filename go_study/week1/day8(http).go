package main

import (
	"fmt"
	"net/http"
	"time"
)

func main() {
	// 基本路由处理
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "欢迎访问首页！当前时间: %v", time.Now())
	})
	http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		name := r.URL.Query().Get("name")
		fmt.Println("name_: ", name)
		fmt.Fprintf(w, "你好, %s!", name)
	})
	fmt.Println("服务器启动在 http://localhost:8080")
	http.ListenAndServe(":8080", nil)

}
