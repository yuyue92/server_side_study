package main

import (
	"errors"
	"fmt"
	"strings"
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
	// 变量与短声明
	var a int = 12
	b := 5
	var x, y, err1 = div(a, b)
	var s1 = sumN(11)
	fmt.Println("hello---go, ", x, y, err1, s1)
	// 字符串与字节
	str1 := "I am a dog"
	u1 := strings.ToUpper(str1)
	fmt.Println("str1: ", str1, " u1: ", u1)

	// 错误处理与包装
	if a1, b1, err2 := div(11, 2); err2 != nil {
		fmt.Println("div error: ", err2)
	} else {
		fmt.Println("a1, b1 =: ", a1, b1)
	}

	// 切片（共享底层数组示意）
	arr1 := [5]int{1, 2, 3, 4, 5}
	str2 := arr1[0]
	str3 := arr1[1:3]
	fmt.Println("arr1: ", arr1, ", str2: ", str2, ", str3: ", str3)
	str3[0] = 99
	fmt.Println(" str3: ", str3, ", arr1: ", arr1)
}
