package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

type User struct {
	ID   int
	Name string
}

// 模拟用户数据库
var userlist = map[int]User{
	1: {ID: 1, Name: "张三"},
	2: {ID: 2, Name: "李四"},
	3: {ID: 3, Name: "王五"},
	4: {ID: 4, Name: "q1"},
	5: {ID: 5, Name: "w2"},
	6: {ID: 6, Name: "e3"},
	7: {ID: 7, Name: "r4"},
}

// get_user_list
func userlistHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userlist)
}

// 处理路径参数: /user/123
func userByIDHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// 从URL中提取ID
	// 例如: /user/123 -> 提取 "123"
	path := r.URL.Path
	parts := strings.Split(path, "/")
	fmt.Println("path: ", path, ", parts: ", parts, " len: ", len(parts))
	if len(parts) != 3 {
		http.Error(w, "无效的URL格式", http.StatusBadRequest)
		return
	}
	// 将字符串ID转换为整数
	idStr := parts[2]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "无效的 id 格式", http.StatusBadRequest)
		return
	}
	// 查找用户
	user, exists := userlist[id]
	if !exists {
		http.Error(w, "用户不存在", http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(user)
}
func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "欢迎访问首页！当前时间: %v", time.Now())
	})
	http.HandleFunc("/users", userlistHandler)
	http.HandleFunc("/user/", userByIDHandler)
	fmt.Println("服务器启动在: http://localhost:8080")
	// fmt.Println("\n测试命令:")
	// fmt.Println("# 路径参数:")
	// fmt.Println("curl http://localhost:8080/user/1")
	// fmt.Println("curl http://localhost:8080/user/2")
	// fmt.Println("\n# 查询参数:")
	// fmt.Println("curl 'http://localhost:8080/search?name=张三&age=25'")
	// fmt.Println("curl 'http://localhost:8080/search?tag=go&tag=web'")
	// fmt.Println("\n# 分页参数:")
	// fmt.Println("curl 'http://localhost:8080/users?page=1&limit=10'")
	// fmt.Println("\n# 组合使用:")
	// fmt.Println("curl 'http://localhost:8080/user/1/detail?extra=true'")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
