package main

import "fmt"

// 命名返回值
func calculate(a, b int) (sum, product int) {
	sum = a + b
	product = a * b
	return // 自动返回命名的返回值
}

func ifElseJudge(score int) {
	if score >= 90 {
		fmt.Println("优秀", score)
	} else if score >= 80 {
		fmt.Println("良好", score)
	} else if score >= 60 {
		fmt.Println("及格", score)
	} else {
		fmt.Println("不及格", score)
	}
}

func caseSwitch(day int) {
	switch day {
	case 1:
		fmt.Println("星期1")
	case 2:
		fmt.Println("星期2")
	case 3:
		fmt.Println("星期3")
	case 6:
		fmt.Println("星期6")
	default:
		fmt.Println("其他")
	}
}

// 定义结构体
type Person struct {
	Name string
	Age  int
	City string
}

// 为Person定义方法
func (p Person) Introduce() {
	fmt.Printf("我是%s，今年%d岁，来自%s\n", p.Name, p.Age, p.City)
}

// 构造函数模式
func setNewPerson(name, city string, age int) *Person {
	return &Person{
		Name: name,
		Age:  age,
		City: city,
	}
}

func main() {
	// 变量声明的几种方式
	var name string = "张三"
	msg := "hello, go!"
	var height float32 = 121.4
	height += 2
	const pi = 3.14
	fmt.Println("======== name: ", name, "msg: ", msg, "height: ", height, ", pi : ", pi, "========")

	// 基本数据类型
	var b bool = true
	var i int = 21
	var f float64 = 3.14
	var s string = "str123"
	// 数组---切片
	var arr [3]int = [3]int{1, 2, 3}
	var slice = []string{"apple", "orange", "banana"}
	// 映射
	m := make(map[string]int)
	m["go"] = 2009
	m["java"] = 1995

	fmt.Printf("布尔: %v, 整数: %v, 浮点: %v, 字符串: %v\n", b, i, f, s)
	fmt.Printf("数组: %v, 切片: %v, 映射: %v\n", arr, slice, m)

	fmt.Println("=======函数练习========")
	sum, product := calculate(4, 5)
	fmt.Printf("4和5的和: %d, 积: %d\n", sum, product)
	// if-else 条件判断
	ifElseJudge(98)
	ifElseJudge(81)
	ifElseJudge(51)

	// switch 语句
	caseSwitch(1)
	caseSwitch(3)

	// for 循环
	fmt.Println("数字1-5:")
	for i := 1; i <= 5; i++ {
		fmt.Println("%d:", i)
	}

	// 遍历切片
	ulist := []string{"q1", "q2", "w3", "e4"}
	for index, val := range ulist {
		fmt.Println("idx: ", index, " val_: ", val)
	}

	fmt.Println("======= 结构体、方法和接口========")

	// 创建结构体实例
	p1 := Person{
		Name: "zhanfg",
		Age:  33,
		City: "guangzhou",
	}
	p1.Introduce()
	p2 := setNewPerson("lisi", "foshan", 44)
	fmt.Printf("%s 现在%d 岁了\n=====%s 现在%d 岁了\n", p1.Name, p1.Age, p2.Name, p2.Age)

}
