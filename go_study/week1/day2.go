package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

type Student struct {
	ID    int
	Name  string
	Age   int
	Email string
}

func main() {
	fmt.Println("====文件操作和JSON====")
	student := []Student{
		{ID: 0, Name: "zhangsan", Age: 33, Email: "zhangsan@333.com"},
		{ID: 1, Name: "lisi", Age: 44, Email: "zhangsan@444.com"},
		{ID: 2, Name: "wangwu", Age: 55, Email: "wangwu@555.com"},
	}
	// 将数据序列化为JSON
	jsonData, err := json.MarshalIndent(student, "", "  ")
	if err != nil {
		log.Fatal("JSON序列化失败:", err)
	}
	fmt.Println("stu: ", student, " jsondata_: ")
	// 写入文件
	filename := "students.json"
	err = os.WriteFile(filename, jsonData, 0644)
	if err != nil {
		log.Fatal("写入文件失败:", err)
	}
	fmt.Printf("数据已写入 %s\n", filename)

	// 从文件读取数据
	fileData, err := os.ReadFile(filename)
	if err != nil {
		log.Fatal("读取文件失败:", err)
	}
	// 反序列化JSON
	var loadedStudents []Student
	err = json.Unmarshal(fileData, &loadedStudents)
	if err != nil {
		log.Fatal("JSON反序列化失败:", err)
	}
	fmt.Println("\n从文件加载的学生信息: ", loadedStudents)
	for _, stu := range loadedStudents {
		// fmt.Println("id: %d, name_: %s, age_: %d, email_: %s \n", stu.ID, stu.Name, stu.Age, stu.Email)
		fmt.Printf("ID: %d, 姓名: %s, 年龄: %d, 邮箱: %s\n", stu.ID, stu.Name, stu.Age, stu.Email)
	}

	// 字符串操作示例
	text := "GO语言,python,java,javascript"
	languages := strings.Split(text, ",")
	fmt.Println("语言列表:", languages)
	fmt.Println("大写:", strings.ToUpper(text))
	fmt.Println("包含Go?", strings.Contains(text, "GO"))

	// 时间操作
	now := time.Now()
	fmt.Println("当前时间:", now.Format("2022-01-03 12:23:34"))
	fmt.Println("Unix时间戳:", now.Unix())

	// 清理文件
	os.Remove(filename)

}
