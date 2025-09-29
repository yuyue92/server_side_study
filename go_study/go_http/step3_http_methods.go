package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

type Response struct {
	Method  string `json:"method"`
	Message string `json:"message"`
}

// 统一的处理器，根据HTTP方法分发
func methodHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var res Response
	// 根据HTTP方法执行不同的逻辑
	// 根据HTTP方法执行不同的逻辑
	switch r.Method {
	case http.MethodGet:
		res = Response{
			Method:  "GET",
			Message: "这是GET请求，用于获取数据",
		}

	case http.MethodPost:
		res = Response{
			Method:  "POST",
			Message: "这是POST请求，用于创建数据",
		}

	case http.MethodPut:
		res = Response{
			Method:  "PUT",
			Message: "这是PUT请求，用于更新数据",
		}

	case http.MethodDelete:
		res = Response{
			Method:  "DELETE",
			Message: "这是DELETE请求，用于删除数据",
		}

	case http.MethodPatch:
		res = Response{
			Method:  "PATCH",
			Message: "这是PATCH请求，用于部分更新数据",
		}

	default:
		// 不支持的方法
		w.WriteHeader(http.StatusMethodNotAllowed)
		res = Response{
			Method:  r.Method,
			Message: "不支持的HTTP方法",
		}
	}

	json.NewEncoder(w).Encode(res)
}

// 只接受GET请求的处理器
func getOnlyHandler(w http.ResponseWriter, r *http.Request) {
	// 检查HTTP方法
	if r.Method != http.MethodGet {
		http.Error(w, "只支持GET方法", http.StatusMethodNotAllowed)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "这个端点只接受GET请求",
	})
}

// 只接受POST请求的处理器
func postOnlyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "只支持POST方法", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "这个端点只接受POST请求",
	})
}

func main() {
	http.HandleFunc("/api/resource", methodHandler)
	http.HandleFunc("/api/getonly", getOnlyHandler)
	http.HandleFunc("/api/postonly", postOnlyHandler)
	fmt.Println("服务器启动在: http://localhost:8080")
	fmt.Println("\n测试命令:")
	fmt.Println("curl -X GET http://localhost:8080/api/resource")
	fmt.Println("curl -X POST http://localhost:8080/api/resource")
	fmt.Println("curl -X PUT http://localhost:8080/api/resource")
	fmt.Println("curl -X DELETE http://localhost:8080/api/resource")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
