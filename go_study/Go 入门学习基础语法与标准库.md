**第 0 步（30 分钟）环境就绪**

安装 Go（最新版即可），确保：

go version、go env GOPATH 可用

go env GOMODCACHE 了解模块缓存路径

新建工作目录：mkdir go-play && cd go-play && go mod init example.com/play

**第 1 周：语法地基 + 必备命令**

目标：熟悉基本语法、类型系统、流程控制、切片/映射、函数与方法、错误处理；会用 go 命令。

学与练
- 语言骨架
   - 变量/常量（:=、const、iota）、基础类型（整型/浮点/布尔/字符串/别名）
   - 条件与循环（if、for、switch）、defer、panic/recover 基本概念
   - 复合类型：数组、切片（长度/容量、append、拷贝与共享底层数组）、映射（键存在性、删除、遍历无序）
   - 结构体、方法、指针与值语义（接收者该选谁）

- 命令与工具
   - go run/build/test、go fmt、go vet、go list
   - 模块：go mod init|tidy、依赖最小化

- 错误处理风格：显式返回 error，包装与判定（errors.New、fmt.Errorf("%w", err)、errors.Is/As）

- 标准库聚焦
   - fmt、errors、strconv、strings、bytes
   - 练习：实现 Atoi/Itoa 的小封装；写 Split/Join 的变体；写函数打印结构体对齐表格

- 里程碑项目 ①：CLI 温度转换器
   - 命令：temp -c 36.6 或 temp -f 98.6，双向转换
   - 用到：flag/os.Args、fmt、strconv、错误处理、go test 覆盖核心换算函数
 
**第 2 周：文件 I/O、时间、集合算法**

目标：掌握文件/流式处理、路径、时间与定时、排序与容器。

学与练
- I/O 与文件系统

os（打开/创建/权限/目录遍历）、io（Reader/Writer 接口）、bufio（缓冲读写）、path/filepath

实战：读取大文件逐行处理（不要一次性读入内存）

- 时间与计时：time（time.Time、Duration、Ticker/Timer、格式化的布局字符串必须是 2006-01-02 15:04:05）

- 排序与容器
   - sort（sort.Slice/Ints、自定义比较）
   - container/heap（最小堆 TopK）与 container/list 了解用法场景

标准库聚焦：os、io、bufio、path/filepath、time、sort、container/heap

里程碑项目 ②：日志分析小工具
- 输入：Nginx/应用日志
- 输出：前 10 个最常见的路径、按时间窗口统计 QPS
- 要求：支持 --topK、--from、--to 参数；大文件流式读取；写 2~3 个单元测试


**第 3 周：JSON/HTTP、并发入门、上下文**

目标：能写简单 HTTP 客户端/服务端，理解 goroutine、channel、context 与 sync。

学与练
- 编解码：encoding/json（结构体标签、omitempty、自定义字段名、嵌套/匿名）；练习：定义配置结构体，读写 JSON 配置文件；未知字段处理
- HTTP：net/http（http.Get/Post、http.Server、Handler、http.ServeMux、中间件模式）； 练习：写一个健康检查与 /echo 的服务；客户端调用并断言响应
- 并发基础：goroutine、无缓冲/有缓冲 channel、select、sync.WaitGroup、sync.Mutex 基础； context（超时/取消传递）
- 标准库聚焦：encoding/json、net/http、context、sync、log、time

里程碑项目 ③：迷你 HTTP 服务
- 路由：/time 返回当前时间；/compute?n=... 做斐波那契或质数统计（用 goroutine 并发计算 + context 超时）
- 要求：优雅关停（Server.Shutdown(ctx)）、基本日志、最少 2 个集成测试（httptest）
