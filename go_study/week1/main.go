package main

import (
	"errors"
	"fmt"
)

// 返回多个值 + 命名返回值示例
func div(a, b int) (q int, r int, err error) {
	if b == 0 {
		return 0, 0, errors.New("divide by zero")
	}
	q, r = a/b, a%b
	return
}

// for 既可当 while 用（条件循环）
func sumN(n int) int {
	s := 0
	for i := 1; i < n; i++ {
		s += i
	}
	return s
}

func main() {
	var a int = 12
	b := 5
	var x, y, err1 = div(a, b)
	var s1 = sumN(11)
	fmt.Println("hello---go, ", x, y, err1, s1)
}
