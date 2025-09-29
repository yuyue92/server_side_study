package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type User struct {
	ID    int
	Name  string
	Email string
	Age   int
}

// 定义响应的数据结构
type Response struct {
	Message   string
	Status    int
	Timestamp time.Time
}

// 返回简单JSON
func jsonHandler(w http.ResponseWriter, r *http.Request) {
	// 设置响应头，告诉客户端返回的是JSON
	w.Header().Set("Content-type", "application/json")
	// 创建响应数据
	res := Response{
		Message:   "这是一个JSON响应113",
		Status:    200,
		Timestamp: time.Now(),
	}
	// 将结构体编码为JSON并写入响应
	json.NewEncoder(w).Encode(res)
}

// 返回格式化的JSON (带缩进，便于阅读)
func prettyJsonHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	user := User{
		ID:    10001,
		Name:  "zhangdns",
		Email: "1888888888888@163.com",
		Age:   33,
	}
	// MarshalIndent 生成格式化的JSON
	data, err := json.MarshalIndent(user, "", "  ")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Write(data)
}

// 返回用户列表
func usersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// 模拟用户列表
	userlist := []User{
		{ID: 1, Name: "张三", Email: "zhangsan@example.com", Age: 25},
		{ID: 2, Name: "李四", Email: "lisi@example.com", Age: 30},
		{ID: 3, Name: "王五", Email: "wangwu@example.com", Age: 28},
	}
	// 方式1: 使用Encoder
	json.NewEncoder(w).Encode(userlist)
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "欢迎访问首页！当前时间: %v", time.Now())
	})
	http.HandleFunc("/json", jsonHandler)
	http.HandleFunc("/pretty", prettyJsonHandler)
	http.HandleFunc("/users", usersHandler)
	fmt.Println("服务器启动在: http://localhost:8080")
	fmt.Println("访问路径:")
	fmt.Println("  http://localhost:8080/json   - 简单JSON响应")
	// fmt.Println("  http://localhost:8080/user   - 单个用户")
	fmt.Println("  http://localhost:8080/users  - 用户列表")
	fmt.Println("  http://localhost:8080/pretty - 格式化JSON==")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
