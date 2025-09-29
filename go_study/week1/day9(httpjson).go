package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Response struct {
	Status    string
	Message   string
	Data      interface{}
	Timestamp time.Time
}

func jsonResponse(w http.ResponseWriter, status int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(Response{
		Status:    http.StatusText(status),
		Message:   message,
		Data:      data,
		Timestamp: time.Now(),
	})
}

func main() {
	http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		jsonResponse(w, http.StatusOK, "服务运行正常", map[string]string{
			"version":     "1.0.0",
			"environment": "development1",
		})
	})
	http.HandleFunc("/api/user", func(w http.ResponseWriter, r *http.Request) {
		cuser := map[string]string{
			"id":    "1001",
			"name":  "zhangsna",
			"email": "zhangsan@333.com",
		}
		jsonResponse(w, http.StatusOK, "用户信息获取成功", cuser)
	})
	fmt.Println("JSON API 服务启动在 http://localhost:8080")
	http.ListenAndServe(":8080", nil)
}
