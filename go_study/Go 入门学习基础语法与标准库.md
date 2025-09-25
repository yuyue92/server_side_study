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
 

