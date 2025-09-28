package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Post struct {
	UserID int
	ID     int
	Title  string
	Body   string
}

func FetchPost(id int) (*Post, error) {
	url := fmt.Sprintf("https://jsonplaceholder.typicode.com/posts/%d", id)
	fmt.Println("url: ", url)
	// 创建HTTP客户端，设置超时
	client := &http.Client{
		Timeout: time.Second * 10,
	}
	response, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP错误: %d", response.StatusCode)
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	var post Post
	err = json.Unmarshal(body, &post)
	if err != nil {
		return nil, err
	}
	return &post, nil

}

func main() {
	fmt.Printf("=====练习2：简单HTTP客户端====")
	post, err := FetchPost(2)
	if err != nil {
		fmt.Println("获取失败:", err)
		return
	}
	fmt.Println("possst: ", post)
	fmt.Printf("文章ID: %d\n", post.ID)
	fmt.Printf("用户ID: %d\n", post.UserID)
	fmt.Printf("标题: %s\n", post.Title)
	fmt.Printf("内容: %s\n", post.Body)
}
