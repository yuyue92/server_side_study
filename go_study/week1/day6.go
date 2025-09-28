// channels.go
package main

import (
	"fmt"
	"time"
)

// 生产者
func producer(ch chan<- int, name string) {
	for i := 1; i <= 5; i++ {
		fmt.Printf("%s 产生: %d\n", name, i)
		ch <- i // 发送数据到通道
		time.Sleep(time.Millisecond * 500)
	}
	close(ch) // 关闭通道
}

// 消费者
func consumer(ch <-chan int, name string) {
	for value := range ch { // 从通道接收数据直到通道关闭
		fmt.Printf("%s 消费: %d\n", name, value)
		time.Sleep(time.Millisecond * 200)
	}
}

// select示例
func selectExample() {
	ch1 := make(chan string)
	ch2 := make(chan string)

	go func() {
		time.Sleep(time.Second)
		ch1 <- "来自通道1的消息"
	}()

	go func() {
		time.Sleep(time.Second * 2)
		ch2 <- "来自通道2的消息"
	}()

	for i := 0; i < 2; i++ {
		select {
		case msg1 := <-ch1:
			fmt.Println("接收到:", msg1)
		case msg2 := <-ch2:
			fmt.Println("接收到:", msg2)
		case <-time.After(time.Second * 3):
			fmt.Println("超时了")
		}
	}
}

func main() {
	fmt.Println("=== Channel基础示例 ===")

	// 创建缓冲通道
	ch := make(chan int, 2)

	go producer(ch, "生产者1")

	time.Sleep(time.Millisecond * 100)
	consumer(ch, "消费者1")

	fmt.Println("\n=== Select示例 ===")
	selectExample()
}
