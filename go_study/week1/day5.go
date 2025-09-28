// goroutines.go
package main

import (
	"fmt"
	"sync"
	"time"
)

func worker(id int, wg *sync.WaitGroup) {
	defer wg.Done() // 确保在函数结束时调用Done

	fmt.Printf("Worker %d 开始工作\n", id)
	time.Sleep(time.Second) // 模拟工作
	fmt.Printf("Worker %d 完成工作\n", id)
}

func countNumbers(name string) {
	for i := 1; i <= 5; i++ {
		fmt.Printf("%s: %d\n", name, i)
		time.Sleep(time.Millisecond * 100)
	}
}

func main() {
	fmt.Println("=== 基本Goroutine示例 ===")

	// 启动goroutine
	go countNumbers("协程A")
	go countNumbers("协程B")

	// 等待一段时间让goroutine执行
	time.Sleep(time.Second)

	fmt.Println("\n=== 使用WaitGroup ===")

	var wg sync.WaitGroup

	// 启动多个worker
	for i := 1; i <= 3; i++ {
		wg.Add(1) // 增加等待计数
		go worker(i, &wg)
	}

	wg.Wait() // 等待所有goroutine完成
	fmt.Println("所有工作完成")
}
