package main

import "fmt"

// 1. 条件语句
func checkScore(n int) string {
	if n > 90 {
		return "excellent"
	} else if n >= 60 {
		return "good"
	} else {
		return "bad"
	}
}

// 2. 循环
func sumNumbers(n int) int {
	sum := 0
	for i := 0; i <= n; i++ {
		sum += i
	}
	return sum
}

// 3. 数组和切片
func collectionDemo() {
	// 数组（固定长度）
	arr := [3]int{1, 2, 66}
	// 切片（动态数组）
	slice := []string{"z", "xc", "q1", "w3"}
	slice = append(slice, "q2")
	slice = append(slice, "a1", "a2")
	fmt.Println("arr: ", arr, " slice: ", slice)
	for idx, val := range arr {
		fmt.Println("idx: ", idx, "val: ", val)
	}
}

func main() {
	var name string = "zhangsna"
	var age int = 98
	isActive := true
	// 3. 基本数据类型
	var (
		score   int     = 66
		price   float64 = 5.99
		isReady bool    = false
	)
	check1 := checkScore(score)
	sum1 := sumNumbers(5)
	fmt.Println("=========check_Score is : ", check1, " sum_number is: ", sum1)
	fmt.Println(score, price, isReady, "==============", name, age, isActive)
	collectionDemo()
}
