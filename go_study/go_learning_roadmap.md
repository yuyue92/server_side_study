# Go语言一周入门学习路线

## 前期准备
- 安装Go环境：https://golang.org/dl/
- 选择IDE：VS Code + Go插件 或 GoLand
- 创建学习目录：`mkdir go-learning && cd go-learning`

---

## Day 1: Go基础语法入门

### 📚 理论学习 (2小时)
- Go语言特点和应用场景
- 包(package)和模块(module)概念
- 基本语法：变量、常量、数据类型
- 函数定义和调用

### 💻 代码练习

#### 练习1：Hello World和基本语法
```go
// main.go
package main

import "fmt"

func main() {
    // 变量声明的几种方式
    var name string = "张三"
    age := 25
    var height float64 = 175.5
    
    // 常量
    const PI = 3.14159
    
    fmt.Printf("姓名: %s, 年龄: %d, 身高: %.1fcm\n", name, age, height)
    fmt.Println("圆周率:", PI)
}
```

#### 练习2：数据类型练习
```go
// types.go
package main

import "fmt"

func main() {
    // 基本数据类型
    var b bool = true
    var i int = 42
    var f float64 = 3.14
    var s string = "Hello Go"
    
    // 数组
    var arr [3]int = [3]int{1, 2, 3}
    
    // 切片
    slice := []string{"apple", "banana", "cherry"}
    
    // 映射
    m := make(map[string]int)
    m["go"] = 2009
    m["java"] = 1995
    
    fmt.Printf("布尔: %v, 整数: %v, 浮点: %v, 字符串: %v\n", b, i, f, s)
    fmt.Printf("数组: %v, 切片: %v, 映射: %v\n", arr, slice, m)
}
```

### 🎯 今日目标
- 能够独立创建Go程序
- 掌握基本数据类型的使用
- 理解包和导入的概念

---

## Day 2: 控制结构和函数

### 📚 理论学习 (2小时)
- 条件语句：if/else, switch
- 循环语句：for循环（Go只有for）
- 函数定义、参数、返回值
- 多返回值特性

### 💻 代码练习

#### 练习1：控制流程
```go
// control.go
package main

import "fmt"

func main() {
    // if-else 条件判断
    score := 85
    if score >= 90 {
        fmt.Println("优秀")
    } else if score >= 80 {
        fmt.Println("良好")
    } else if score >= 60 {
        fmt.Println("及格")
    } else {
        fmt.Println("不及格")
    }
    
    // switch 语句
    day := 3
    switch day {
    case 1:
        fmt.Println("星期一")
    case 2:
        fmt.Println("星期二")
    case 3:
        fmt.Println("星期三")
    default:
        fmt.Println("其他")
    }
    
    // for 循环
    fmt.Println("数字1-5:")
    for i := 1; i <= 5; i++ {
        fmt.Printf("%d ", i)
    }
    fmt.Println()
    
    // 遍历切片
    fruits := []string{"苹果", "香蕉", "橙子"}
    for index, fruit := range fruits {
        fmt.Printf("%d: %s\n", index, fruit)
    }
}
```

#### 练习2：函数练习
```go
// functions.go
package main

import "fmt"

// 简单函数
func greet(name string) string {
    return "Hello, " + name + "!"
}

// 多参数函数
func add(a, b int) int {
    return a + b
}

// 多返回值函数
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("division by zero")
    }
    return a / b, nil
}

// 命名返回值
func calculate(a, b int) (sum, product int) {
    sum = a + b
    product = a * b
    return // 自动返回命名的返回值
}

func main() {
    fmt.Println(greet("张三"))
    fmt.Println("5 + 3 =", add(5, 3))
    
    result, err := divide(10, 2)
    if err != nil {
        fmt.Println("错误:", err)
    } else {
        fmt.Println("10 / 2 =", result)
    }
    
    sum, product := calculate(4, 5)
    fmt.Printf("4和5的和: %d, 积: %d\n", sum, product)
}
```

### 🎯 今日目标
- 熟练使用if/else和switch语句
- 掌握for循环和range遍历
- 能够编写和调用函数
- 理解Go的多返回值特性

---

## Day 3: 结构体、方法和接口

### 📚 理论学习 (2.5小时)
- 结构体(struct)定义和使用
- 方法(method)的定义
- 接口(interface)概念
- 指针基础

### 💻 代码练习

#### 练习1：结构体和方法
```go
// structs.go
package main

import "fmt"

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

// 指针接收者方法（可以修改结构体）
func (p *Person) SetAge(age int) {
    p.Age = age
}

// 构造函数模式
func NewPerson(name, city string, age int) *Person {
    return &Person{
        Name: name,
        Age:  age,
        City: city,
    }
}

func main() {
    // 创建结构体实例
    p1 := Person{
        Name: "张三",
        Age:  25,
        City: "北京",
    }
    
    // 使用构造函数
    p2 := NewPerson("李四", "上海", 30)
    
    p1.Introduce()
    p2.Introduce()
    
    // 修改年龄
    p1.SetAge(26)
    fmt.Printf("%s现在%d岁了\n", p1.Name, p1.Age)
}
```

#### 练习2：接口
```go
// interfaces.go
package main

import "fmt"

// 定义接口
type Shape interface {
    Area() float64
    Perimeter() float64
}

type Rectangle struct {
    Width  float64
    Height float64
}

type Circle struct {
    Radius float64
}

// Rectangle实现Shape接口
func (r Rectangle) Area() float64 {
    return r.Width * r.Height
}

func (r Rectangle) Perimeter() float64 {
    return 2 * (r.Width + r.Height)
}

// Circle实现Shape接口
func (c Circle) Area() float64 {
    return 3.14159 * c.Radius * c.Radius
}

func (c Circle) Perimeter() float64 {
    return 2 * 3.14159 * c.Radius
}

// 使用接口的函数
func printShapeInfo(s Shape) {
    fmt.Printf("面积: %.2f, 周长: %.2f\n", s.Area(), s.Perimeter())
}

func main() {
    rect := Rectangle{Width: 10, Height: 5}
    circle := Circle{Radius: 3}
    
    fmt.Println("矩形信息:")
    printShapeInfo(rect)
    
    fmt.Println("圆形信息:")
    printShapeInfo(circle)
}
```

### 🎯 今日目标
- 理解结构体的定义和使用
- 掌握方法的定义，区分值接收者和指针接收者
- 理解接口的概念和实现
- 初步了解指针的使用

---

## Day 4: 错误处理和包管理

### 📚 理论学习 (2小时)
- Go的错误处理机制
- panic和recover
- 包的创建和导入
- Go Modules使用

### 💻 代码练习

#### 练习1：错误处理
```go
// errors.go
package main

import (
    "errors"
    "fmt"
    "strconv"
)

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

// defer, panic, recover示例
func divide(a, b int) (result int) {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("捕获到panic:", r)
            result = 0
        }
    }()
    
    if b == 0 {
        panic("除数不能为0")
    }
    
    return a / b
}

func main() {
    // 错误处理
    ages := []string{"25", "abc", "-5", "200"}
    
    for _, ageStr := range ages {
        age, err := validateAge(ageStr)
        if err != nil {
            fmt.Printf("验证失败 - %s: %v\n", ageStr, err)
        } else {
            fmt.Printf("验证成功 - %s: %d岁\n", ageStr, age)
        }
    }
    
    // panic和recover
    fmt.Println("10 / 2 =", divide(10, 2))
    fmt.Println("10 / 0 =", divide(10, 0))
    fmt.Println("程序继续执行...")
}
```

#### 练习2：创建自定义包
```go
// utils/math.go
package utils

import "math"

// Add 两数相加
func Add(a, b float64) float64 {
    return a + b
}

// CircleArea 计算圆的面积
func CircleArea(radius float64) float64 {
    return math.Pi * radius * radius
}

// IsEven 判断是否为偶数
func IsEven(n int) bool {
    return n%2 == 0
}
```

```go
// main.go (使用自定义包)
package main

import (
    "fmt"
    "./utils" // 本地包导入
)

func main() {
    fmt.Println("5 + 3 =", utils.Add(5, 3))
    fmt.Println("半径为5的圆面积:", utils.CircleArea(5))
    fmt.Println("10是偶数吗?", utils.IsEven(10))
    fmt.Println("7是偶数吗?", utils.IsEven(7))
}
```

### 🎯 今日目标
- 掌握Go的错误处理模式
- 了解panic和recover机制
- 能够创建和使用自定义包
- 初步了解Go Modules

---

## Day 5: 并发编程基础

### 📚 理论学习 (3小时)
- Goroutine概念和使用
- Channel通道通信
- select语句
- sync包基础

### 💻 代码练习

#### 练习1：Goroutine基础
```go
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
```

#### 练习2：Channel通信
```go
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
```

### 🎯 今日目标
- 理解goroutine的概念和使用
- 掌握channel的基本操作
- 了解select语句的使用
- 学会使用sync.WaitGroup

---

## Day 6: 标准库和实际项目

### 📚 理论学习 (2小时)
- 常用标准库：fmt, strings, time, os, io
- 文件操作
- JSON处理
- HTTP客户端基础

### 💻 代码练习

#### 练习1：文件操作和JSON
```go
// fileops.go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "os"
    "strings"
    "time"
)

type Student struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Age   int    `json:"age"`
    Email string `json:"email"`
}

func main() {
    // 创建学生数据
    students := []Student{
        {ID: 1, Name: "张三", Age: 20, Email: "zhangsan@example.com"},
        {ID: 2, Name: "李四", Age: 21, Email: "lisi@example.com"},
        {ID: 3, Name: "王五", Age: 19, Email: "wangwu@example.com"},
    }
    
    // 将数据序列化为JSON
    jsonData, err := json.MarshalIndent(students, "", "  ")
    if err != nil {
        log.Fatal("JSON序列化失败:", err)
    }
    
    // 写入文件
    filename := "students.json"
    err = ioutil.WriteFile(filename, jsonData, 0644)
    if err != nil {
        log.Fatal("写入文件失败:", err)
    }
    
    fmt.Printf("数据已写入 %s\n", filename)
    
    // 从文件读取数据
    fileData, err := ioutil.ReadFile(filename)
    if err != nil {
        log.Fatal("读取文件失败:", err)
    }
    
    // 反序列化JSON
    var loadedStudents []Student
    err = json.Unmarshal(fileData, &loadedStudents)
    if err != nil {
        log.Fatal("JSON反序列化失败:", err)
    }
    
    fmt.Println("\n从文件加载的学生信息:")
    for _, student := range loadedStudents {
        fmt.Printf("ID: %d, 姓名: %s, 年龄: %d, 邮箱: %s\n",
            student.ID, student.Name, student.Age, student.Email)
    }
    
    // 字符串操作示例
    fmt.Println("\n字符串操作示例:")
    text := "Go语言,Python,JavaScript,Java"
    languages := strings.Split(text, ",")
    fmt.Println("语言列表:", languages)
    fmt.Println("大写:", strings.ToUpper(text))
    fmt.Println("包含Go?", strings.Contains(text, "Go"))
    
    // 时间操作
    fmt.Println("\n时间操作:")
    now := time.Now()
    fmt.Println("当前时间:", now.Format("2006-01-02 15:04:05"))
    fmt.Println("Unix时间戳:", now.Unix())
    
    // 清理文件
    os.Remove(filename)
}
```

#### 练习2：简单HTTP客户端
```go
// httpclient.go
package main

import (
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
    "time"
)

type Post struct {
    UserID int    `json:"userId"`
    ID     int    `json:"id"`
    Title  string `json:"title"`
    Body   string `json:"body"`
}

func fetchPost(id int) (*Post, error) {
    url := fmt.Sprintf("https://jsonplaceholder.typicode.com/posts/%d", id)
    
    // 创建HTTP客户端，设置超时
    client := &http.Client{
        Timeout: 10 * time.Second,
    }
    
    resp, err := client.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("HTTP错误: %d", resp.StatusCode)
    }
    
    body, err := ioutil.ReadAll(resp.Body)
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
    fmt.Println("获取文章信息...")
    
    post, err := fetchPost(1)
    if err != nil {
        fmt.Println("获取失败:", err)
        return
    }
    
    fmt.Printf("文章ID: %d\n", post.ID)
    fmt.Printf("用户ID: %d\n", post.UserID)
    fmt.Printf("标题: %s\n", post.Title)
    fmt.Printf("内容: %s\n", post.Body)
}
```

### 🎯 今日目标
- 掌握文件读写操作
- 学会JSON的序列化和反序列化
- 了解HTTP客户端的使用
- 熟悉常用标准库的使用

---

## Day 7: 综合实战项目

### 📚 理论学习 (1小时)
- 代码组织和项目结构
- 测试编写基础
- 项目部署准备

### 💻 综合项目：任务管理系统

#### 项目结构
```
task-manager/
├── main.go
├── models/
│   └── task.go
├── handlers/
│   └── task_handler.go
├── storage/
│   └── file_storage.go
└── tasks.json
```

#### models/task.go
```go
package models

import "time"

type Task struct {
    ID          int       `json:"id"`
    Title       string    `json:"title"`
    Description string    `json:"description"`
    Completed   bool      `json:"completed"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type TaskManager struct {
    tasks   []Task
    nextID  int
    storage TaskStorage
}

type TaskStorage interface {
    Save(tasks []Task) error
    Load() ([]Task, error)
}

func NewTaskManager(storage TaskStorage) *TaskManager {
    tm := &TaskManager{
        tasks:   []Task{},
        nextID:  1,
        storage: storage,
    }
    
    // 加载现有任务
    if loadedTasks, err := storage.Load(); err == nil {
        tm.tasks = loadedTasks
        if len(loadedTasks) > 0 {
            tm.nextID = loadedTasks[len(loadedTasks)-1].ID + 1
        }
    }
    
    return tm
}

func (tm *TaskManager) AddTask(title, description string) *Task {
    task := Task{
        ID:          tm.nextID,
        Title:       title,
        Description: description,
        Completed:   false,
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }
    
    tm.tasks = append(tm.tasks, task)
    tm.nextID++
    tm.storage.Save(tm.tasks)
    
    return &task
}

func (tm *TaskManager) GetAllTasks() []Task {
    return tm.tasks
}

func (tm *TaskManager) CompleteTask(id int) error {
    for i := range tm.tasks {
        if tm.tasks[i].ID == id {
            tm.tasks[i].Completed = true
            tm.tasks[i].UpdatedAt = time.Now()
            tm.storage.Save(tm.tasks)
            return nil
        }
    }
    return fmt.Errorf("task with ID %d not found", id)
}

func (tm *TaskManager) DeleteTask(id int) error {
    for i := range tm.tasks {
        if tm.tasks[i].ID == id {
            tm.tasks = append(tm.tasks[:i], tm.tasks[i+1:]...)
            tm.storage.Save(tm.tasks)
            return nil
        }
    }
    return fmt.Errorf("task with ID %d not found", id)
}
```

#### storage/file_storage.go
```go
package storage

import (
    "encoding/json"
    "io/ioutil"
    "os"
    "../models"
)

type FileStorage struct {
    filename string
}

func NewFileStorage(filename string) *FileStorage {
    return &FileStorage{filename: filename}
}

func (fs *FileStorage) Save(tasks []models.Task) error {
    data, err := json.MarshalIndent(tasks, "", "  ")
    if err != nil {
        return err
    }
    
    return ioutil.WriteFile(fs.filename, data, 0644)
}

func (fs *FileStorage) Load() ([]models.Task, error) {
    if _, err := os.Stat(fs.filename); os.IsNotExist(err) {
        return []models.Task{}, nil
    }
    
    data, err := ioutil.ReadFile(fs.filename)
    if err != nil {
        return nil, err
    }
    
    var tasks []models.Task
    err = json.Unmarshal(data, &tasks)
    if err != nil {
        return nil, err
    }
    
    return tasks, nil
}
```

#### main.go
```go
package main

import (
    "bufio"
    "fmt"
    "os"
    "strconv"
    "strings"
    "./models"
    "./storage"
)

func main() {
    // 初始化存储和任务管理器
    fileStorage := storage.NewFileStorage("tasks.json")
    taskManager := models.NewTaskManager(fileStorage)
    
    scanner := bufio.NewScanner(os.Stdin)
    
    fmt.Println("=== 任务管理系统 ===")
    fmt.Println("命令: add <标题> <描述> | list | complete <ID> | delete <ID> | quit")
    
    for {
        fmt.Print("\n请输入命令: ")
        if !scanner.Scan() {
            break
        }
        
        input := strings.TrimSpace(scanner.Text())
        parts := strings.Fields(input)
        
        if len(parts) == 0 {
            continue
        }
        
        command := parts[0]
        
        switch command {
        case "add":
            if len(parts) < 3 {
                fmt.Println("用法: add <标题> <描述>")
                continue
            }
            title := parts[1]
            description := strings.Join(parts[2:], " ")
            task := taskManager.AddTask(title, description)
            fmt.Printf("任务已添加: ID=%d, 标题=%s\n", task.ID, task.Title)
            
        case "list":
            tasks := taskManager.GetAllTasks()
            if len(tasks) == 0 {
                fmt.Println("暂无任务")
                continue
            }
            
            fmt.Println("\n任务列表:")
            for _, task := range tasks {
                status := "待完成"
                if task.Completed {
                    status = "已完成"
                }
                fmt.Printf("ID: %d | %s | %s | %s\n",
                    task.ID, task.Title, status, task.CreatedAt.Format("2006-01-02 15:04"))
            }
            
        case "complete":
            if len(parts) != 2 {
                fmt.Println("用法: complete <任务ID>")
                continue
            }
            
            id, err := strconv.Atoi(parts[1])
            if err != nil {
                fmt.Println("无效的任务ID")
                continue
            }
            
            err = taskManager.CompleteTask(id)
            if err != nil {
                fmt.Println("错误:", err)
            } else {
                fmt.Printf("任务 %d 已标记为完成\n", id)
            }
            
        case "delete":
            if len(parts) != 2 {
                fmt.Println("用法: delete <任务ID>")
                continue
            }
            
            id, err := strconv.Atoi(parts[1])
            if err != nil {
                fmt.Println("无效的任务ID")
                continue
            }
            
            err = taskManager.DeleteTask(id)
            if err != nil {
                fmt.Println("错误:", err)
            } else {
                fmt.Printf("任务 %d 已删除\n", id)
            }
            
        case "quit":
            fmt.Println("再见!")
            return
            
        default:
            fmt.Println("未知命令，请重新输入")
        }
    }
}
```

### 🎯 今日目标
- 完成一个完整的Go项目
- 理解项目结构组织
- 掌握接口的实际应用
- 综合运用前6天学到的知识

### 💻 额外练习：测试编写

#### task_test.go (基础测试示例)
```go
package main

import (
    "testing"
    "./models"
    "./storage"
)

// 模拟存储，用于测试
type MockStorage struct {
    tasks []models.Task
}

func (ms *MockStorage) Save(tasks []models.Task) error {
    ms.tasks = make([]models.Task, len(tasks))
    copy(ms.tasks, tasks)
    return nil
}

func (ms *MockStorage) Load() ([]models.Task, error) {
    return ms.tasks, nil
}

func TestTaskManager_AddTask(t *testing.T) {
    storage := &MockStorage{}
    tm := models.NewTaskManager(storage)
    
    task := tm.AddTask("测试任务", "这是一个测试任务")
    
    if task.ID != 1 {
        t.Errorf("期望任务ID为1，实际为%d", task.ID)
    }
    
    if task.Title != "测试任务" {
        t.Errorf("期望任务标题为'测试任务'，实际为'%s'", task.Title)
    }
    
    if task.Completed {
        t.Error("新任务应该是未完成状态")
    }
}

func TestTaskManager_CompleteTask(t *testing.T) {
    storage := &MockStorage{}
    tm := models.NewTaskManager(storage)
    
    task := tm.AddTask("测试任务", "这是一个测试任务")
    
    err := tm.CompleteTask(task.ID)
    if err != nil {
        t.Errorf("完成任务时出错: %v", err)
    }
    
    tasks := tm.GetAllTasks()
    if !tasks[0].Completed {
        t.Error("任务应该是已完成状态")
    }
}
```

运行测试：`go test`

---

## 📋 学习总结和后续规划

### 本周学习成果
- ✅ 掌握Go语言基础语法
- ✅ 理解Go的并发编程模型
- ✅ 学会使用标准库
- ✅ 能够编写结构化的Go程序
- ✅ 完成了一个实际项目

### 推荐后续学习方向

#### 第2周：深入进阶
1. **Web开发**: 学习Gin或Echo框架
2. **数据库操作**: 学习GORM或原生database/sql
3. **微服务基础**: gRPC入门
4. **测试进阶**: 表格驱动测试、基准测试

#### 第3-4周：实战项目
1. **RESTful API**: 构建完整的Web API
2. **数据库集成**: 添加MySQL/PostgreSQL支持
3. **中间件**: 认证、日志、限流等
4. **部署**: Docker化和云部署

#### 持续学习资源
- 官方文档: https://golang.org/doc/
- Go by Example: https://gobyexample.com/
- The Go Programming Language (书籍)
- Go语言圣经 (中文版)

### 日常练习建议
- 每天至少写30分钟Go代码
- 参与开源项目贡献
- 阅读优秀的Go开源项目源码
- 关注Go官方博客和社区动态

### 面试准备要点
1. **基础概念**: goroutine、channel、interface
2. **内存管理**: GC机制、逃逸分析
3. **并发安全**: sync包的使用
4. **性能优化**: pprof工具使用
5. **项目经验**: 能够描述完整的Go项目开发经历

---

## 🚀 快速上手检查清单

### Day 1 检查点
- [ ] 成功安装Go环境
- [ ] 能够运行Hello World程序
- [ ] 理解变量声明的几种方式
- [ ] 掌握基本数据类型

### Day 2 检查点
- [ ] 熟练使用if/else和switch
- [ ] 掌握for循环和range遍历
- [ ] 能够定义和调用函数
- [ ] 理解多返回值

### Day 3 检查点
- [ ] 能够定义和使用结构体
- [ ] 理解方法的值接收者和指针接收者
- [ ] 掌握接口的定义和实现
- [ ] 初步理解指针概念

### Day 4 检查点
- [ ] 掌握错误处理模式
- [ ] 了解panic和recover
- [ ] 能够创建自定义包
- [ ] 理解包的导入和使用

### Day 5 检查点
- [ ] 理解goroutine概念
- [ ] 掌握channel基本操作
- [ ] 会使用select语句
- [ ] 了解sync.WaitGroup

### Day 6 检查点
- [ ] 能够进行文件读写操作
- [ ] 掌握JSON序列化和反序列化
- [ ] 了解HTTP客户端使用
- [ ] 熟悉常用标准库

### Day 7 检查点
- [ ] 完成任务管理系统项目
- [ ] 理解项目结构组织
- [ ] 能够编写基础测试
- [ ] 综合运用所学知识

---

## 💡 学习建议

1. **动手实践**: 每个代码示例都要亲自运行和修改
2. **循序渐进**: 不要跳跃学习，确保每天的知识点都掌握
3. **多写代码**: 除了给出的练习，尝试写一些自己的小程序
4. **查阅文档**: 养成查看官方文档的习惯
5. **社区交流**: 加入Go语言相关的技术社群
6. **错误调试**: 学会读懂错误信息和调试技巧
7. **代码规范**: 使用`go fmt`格式化代码，学习Go的编码规范

记住：Go语言的设计哲学是"少即是多"，它追求简洁、高效。作为前端开发者，你会发现Go在很多方面都体现了这种简洁的美学。坚持每天的练习，一周后你就能掌握Go的核心概念并开始实际项目开发了！