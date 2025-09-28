package main

import (
	"errors"
	"fmt"
	"strconv"
	// 本地包导入
)

// 简单函数
func greet(name string) string {
	return "hello_" + name
}
func add(a, b int) int {
	return a + b
}

// 自定义错误类型
type ValidationError struct {
	Field   string
	Message string
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("字段 %s: %s", e.Field, e.Message)
}

// 验证年龄的函数
func validateAge(ageStr string) (int, error) {
	age, err := strconv.Atoi(ageStr)
	if err != nil {
		return 0, errors.New("年龄必须是数字")
	}
	if age < 0 {
		return 0, ValidationError{
			Field:   "age",
			Message: "年龄不能为负数",
		}
	}
	if age > 150 {
		return 0, ValidationError{
			Field:   "age",
			Message: "年龄不能超过150岁",
		}
	}
	return age, nil
}

func main() {
	fmt.Println(add(2, 5), "====", greet("zhangsna"))
	// 错误处理
	ages := []string{"25", "abc", "-5", "178"}
	for _, agestr := range ages {
		age, err := validateAge(agestr)
		if err != nil {
			fmt.Printf("验证失败: ", age, err)
			fmt.Printf("\n=========")
		} else {
			fmt.Printf("验证成功: ", agestr, age)
			fmt.Printf("\n=========")
		}
	}

}
