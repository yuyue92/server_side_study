# Go语言进阶学习路线 - 深入实战篇

## 📚 学习前提
- 已掌握Go基础语法、结构体、接口、goroutine、channel
- 完成过至少一个小型Go项目
- 熟悉基本的错误处理和包管理

---

## Week 1: 高级并发编程与设计模式

### Day 1: 深入Channel和Context

#### 📖 核心概念
- Channel的内部实现机制
- Context包的使用和传播
- 优雅关闭和超时控制
- Pipeline模式

#### 💻 实战代码

##### 练习1: 高级Channel模式
```go
// advanced_channels.go
package main

import (
    "context"
    "fmt"
    "math/rand"
    "sync"
    "time"
)

// Pipeline模式 - 数据处理管道
func pipeline() {
    fmt.Println("=== Pipeline模式演示 ===")
    
    // 阶段1: 生成数字
    generate := func(ctx context.Context) <-chan int {
        out := make(chan int)
        go func() {
            defer close(out)
            for i := 1; i <= 10; i++ {
                select {
                case out <- i:
                    time.Sleep(100 * time.Millisecond)
                case <-ctx.Done():
                    fmt.Println("生成器被取消")
                    return
                }
            }
        }()
        return out
    }
    
    // 阶段2: 数字平方
    square := func(ctx context.Context, in <-chan int) <-chan int {
        out := make(chan int)
        go func() {
            defer close(out)
            for num := range in {
                select {
                case out <- num * num:
                    time.Sleep(50 * time.Millisecond)
                case <-ctx.Done():
                    fmt.Println("平方计算器被取消")
                    return
                }
            }
        }()
        return out
    }
    
    // 阶段3: 过滤偶数
    filterEven := func(ctx context.Context, in <-chan int) <-chan int {
        out := make(chan int)
        go func() {
            defer close(out)
            for num := range in {
                if num%2 == 0 {
                    select {
                    case out <- num:
                    case <-ctx.Done():
                        fmt.Println("过滤器被取消")
                        return
                    }
                }
            }
        }()
        return out
    }
    
    // 创建带超时的context
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()
    
    // 构建Pipeline
    nums := generate(ctx)
    squared := square(ctx, nums)
    filtered := filterEven(ctx, squared)
    
    // 消费结果
    for result := range filtered {
        fmt.Printf("结果: %d\n", result)
    }
}

// Fan-out/Fan-in模式
func fanOutFanIn() {
    fmt.Println("\n=== Fan-out/Fan-in模式演示 ===")
    
    // 工作函数
    worker := func(id int, jobs <-chan int, results chan<- int) {
        for job := range jobs {
            // 模拟耗时工作
            time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
            results <- job * 2
            fmt.Printf("Worker %d 处理了任务 %d\n", id, job)
        }
    }
    
    // 创建通道
    jobs := make(chan int, 10)
    results := make(chan int, 10)
    
    // 启动3个worker (Fan-out)
    var wg sync.WaitGroup
    for w := 1; w <= 3; w++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            worker(id, jobs, results)
        }(w)
    }
    
    // 发送任务
    go func() {
        for j := 1; j <= 9; j++ {
            jobs <- j
        }
        close(jobs)
    }()
    
    // 等待所有worker完成并关闭结果通道
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // 收集结果 (Fan-in)
    for result := range results {
        fmt.Printf("收到结果: %d\n", result)
    }
}

// Context传播和取消
func contextPropagation() {
    fmt.Println("\n=== Context传播演示 ===")
    
    // 模拟HTTP请求处理
    processRequest := func(ctx context.Context, requestID string) {
        // 添加请求ID到context
        ctx = context.WithValue(ctx, "requestID", requestID)
        
        // 设置5秒超时
        ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
        defer cancel()
        
        // 调用数据库查询
        dbQuery(ctx)
    }
    
    dbQuery := func(ctx context.Context) {
        requestID := ctx.Value("requestID").(string)
        fmt.Printf("开始数据库查询，请求ID: %s\n", requestID)
        
        // 模拟数据库查询
        select {
        case <-time.After(2 * time.Second):
            fmt.Printf("数据库查询完成，请求ID: %s\n", requestID)
        case <-ctx.Done():
            fmt.Printf("数据库查询被取消: %v，请求ID: %s\n", ctx.Err(), requestID)
        }
    }
    
    // 模拟多个并发请求
    var wg sync.WaitGroup
    for i := 1; i <= 3; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            requestID := fmt.Sprintf("req-%d", id)
            processRequest(context.Background(), requestID)
        }(i)
    }
    
    wg.Wait()
}

func main() {
    rand.Seed(time.Now().UnixNano())
    
    pipeline()
    fanOutFanIn()
    contextPropagation()
}
```

##### 练习2: 高级并发控制
```go
// concurrency_control.go
package main

import (
    "context"
    "fmt"
    "sync"
    "sync/atomic"
    "time"
)

// 信号量实现 - 控制并发数量
type Semaphore struct {
    ch chan struct{}
}

func NewSemaphore(maxConcurrency int) *Semaphore {
    return &Semaphore{
        ch: make(chan struct{}, maxConcurrency),
    }
}

func (s *Semaphore) Acquire() {
    s.ch <- struct{}{}
}

func (s *Semaphore) Release() {
    <-s.ch
}

// 工作池模式
type WorkPool struct {
    workerCount int
    jobQueue    chan Job
    quit        chan bool
    wg          sync.WaitGroup
}

type Job struct {
    ID   int
    Data string
}

func NewWorkPool(workerCount, queueSize int) *WorkPool {
    return &WorkPool{
        workerCount: workerCount,
        jobQueue:    make(chan Job, queueSize),
        quit:        make(chan bool),
    }
}

func (wp *WorkPool) Start() {
    for i := 0; i < wp.workerCount; i++ {
        wp.wg.Add(1)
        go wp.worker(i)
    }
}

func (wp *WorkPool) worker(id int) {
    defer wp.wg.Done()
    fmt.Printf("Worker %d 启动\n", id)
    
    for {
        select {
        case job := <-wp.jobQueue:
            fmt.Printf("Worker %d 处理任务 %d: %s\n", id, job.ID, job.Data)
            // 模拟工作时间
            time.Sleep(time.Duration(100+job.ID*50) * time.Millisecond)
            fmt.Printf("Worker %d 完成任务 %d\n", id, job.ID)
            
        case <-wp.quit:
            fmt.Printf("Worker %d 停止\n", id)
            return
        }
    }
}

func (wp *WorkPool) Submit(job Job) {
    wp.jobQueue <- job
}

func (wp *WorkPool) Stop() {
    close(wp.quit)
    wp.wg.Wait()
    close(wp.jobQueue)
}

// 原子操作计数器
type AtomicCounter struct {
    count int64
}

func (c *AtomicCounter) Increment() {
    atomic.AddInt64(&c.count, 1)
}

func (c *AtomicCounter) Decrement() {
    atomic.AddInt64(&c.count, -1)
}

func (c *AtomicCounter) Value() int64 {
    return atomic.LoadInt64(&c.count)
}

// 单例模式 - 线程安全
type Singleton struct {
    data string
}

var (
    instance *Singleton
    once     sync.Once
)

func GetSingleton() *Singleton {
    once.Do(func() {
        fmt.Println("创建Singleton实例")
        instance = &Singleton{data: "我是单例"}
    })
    return instance
}

func demonstrateConcurrencyPatterns() {
    fmt.Println("=== 并发控制模式演示 ===")
    
    // 1. 信号量控制并发
    fmt.Println("\n1. 信号量限流演示:")
    sem := NewSemaphore(2) // 最多2个并发
    var wg sync.WaitGroup
    
    for i := 1; i <= 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            fmt.Printf("任务 %d 等待获取信号量...\n", id)
            sem.Acquire()
            fmt.Printf("任务 %d 开始执行\n", id)
            
            // 模拟工作
            time.Sleep(1 * time.Second)
            
            fmt.Printf("任务 %d 执行完毕\n", id)
            sem.Release()
        }(i)
    }
    wg.Wait()
    
    // 2. 工作池模式
    fmt.Println("\n2. 工作池模式演示:")
    workPool := NewWorkPool(3, 10)
    workPool.Start()
    
    // 提交任务
    for i := 1; i <= 8; i++ {
        job := Job{
            ID:   i,
            Data: fmt.Sprintf("任务数据-%d", i),
        }
        workPool.Submit(job)
    }
    
    // 等待一段时间让任务执行
    time.Sleep(3 * time.Second)
    workPool.Stop()
    
    // 3. 原子操作
    fmt.Println("\n3. 原子操作演示:")
    counter := &AtomicCounter{}
    var wg2 sync.WaitGroup
    
    // 启动多个goroutine同时修改计数器
    for i := 0; i < 100; i++ {
        wg2.Add(1)
        go func() {
            defer wg2.Done()
            counter.Increment()
        }()
    }
    wg2.Wait()
    fmt.Printf("原子计数器最终值: %d\n", counter.Value())
    
    // 4. 单例模式
    fmt.Println("\n4. 单例模式演示:")
    var wg3 sync.WaitGroup
    for i := 0; i < 5; i++ {
        wg3.Add(1)
        go func(id int) {
            defer wg3.Done()
            singleton := GetSingleton()
            fmt.Printf("Goroutine %d 获取到单例: %s\n", id, singleton.data)
        }(i)
    }
    wg3.Wait()
}

func main() {
    demonstrateConcurrencyPatterns()
}
```

#### 🎯 学习要点
1. **Pipeline模式**: 数据在多个阶段之间流动处理
2. **Fan-out/Fan-in**: 并发处理后聚合结果
3. **Context传播**: 在调用链中传递取消信号和元数据
4. **工作池**: 控制并发数量，复用goroutine
5. **原子操作**: 无锁的线程安全操作

---

### Day 2: 反射和接口进阶

#### 📖 核心概念
- reflect包的使用
- 类型断言和类型开关
- 空接口的应用
- 动态调用和序列化

#### 💻 实战代码

##### 练习1: 反射基础应用
```go
// reflection.go
package main

import (
    "fmt"
    "reflect"
    "strings"
)

// 结构体标签示例
type User struct {
    ID       int    `json:"id" validate:"required"`
    Name     string `json:"name" validate:"required,min=2"`
    Email    string `json:"email" validate:"email"`
    Age      int    `json:"age" validate:"min=0,max=120"`
    IsActive bool   `json:"is_active"`
}

// 通用验证器
type Validator struct{}

func (v *Validator) Validate(data interface{}) []string {
    var errors []string
    
    val := reflect.ValueOf(data)
    typ := reflect.TypeOf(data)
    
    // 如果是指针，获取其指向的值
    if val.Kind() == reflect.Ptr {
        val = val.Elem()
        typ = typ.Elem()
    }
    
    for i := 0; i < val.NumField(); i++ {
        field := val.Field(i)
        fieldType := typ.Field(i)
        
        // 获取validate标签
        validateTag := fieldType.Tag.Get("validate")
        if validateTag == "" {
            continue
        }
        
        fieldName := fieldType.Name
        rules := strings.Split(validateTag, ",")
        
        for _, rule := range rules {
            err := v.validateField(fieldName, field, rule)
            if err != "" {
                errors = append(errors, err)
            }
        }
    }
    
    return errors
}

func (v *Validator) validateField(fieldName string, field reflect.Value, rule string) string {
    switch {
    case rule == "required":
        if v.isEmpty(field) {
            return fmt.Sprintf("%s is required", fieldName)
        }
        
    case strings.HasPrefix(rule, "min="):
        minStr := strings.TrimPrefix(rule, "min=")
        if minStr != "" {
            if field.Kind() == reflect.String {
                if len(field.String()) < 2 {
                    return fmt.Sprintf("%s must be at least 2 characters", fieldName)
                }
            } else if field.Kind() == reflect.Int {
                if field.Int() < 0 {
                    return fmt.Sprintf("%s must be at least 0", fieldName)
                }
            }
        }
        
    case strings.HasPrefix(rule, "max="):
        maxStr := strings.TrimPrefix(rule, "max=")
        if maxStr != "" && field.Kind() == reflect.Int {
            if field.Int() > 120 {
                return fmt.Sprintf("%s must be at most 120", fieldName)
            }
        }
        
    case rule == "email":
        if field.Kind() == reflect.String {
            email := field.String()
            if !strings.Contains(email, "@") {
                return fmt.Sprintf("%s must be a valid email", fieldName)
            }
        }
    }
    
    return ""
}

func (v *Validator) isEmpty(field reflect.Value) bool {
    switch field.Kind() {
    case reflect.String:
        return field.String() == ""
    case reflect.Int:
        return field.Int() == 0
    case reflect.Bool:
        return false // bool类型的zero value是false，通常不认为是空
    default:
        return field.IsZero()
    }
}

// 结构体转Map
func StructToMap(data interface{}) map[string]interface{} {
    result := make(map[string]interface{})
    
    val := reflect.ValueOf(data)
    typ := reflect.TypeOf(data)
    
    if val.Kind() == reflect.Ptr {
        val = val.Elem()
        typ = typ.Elem()
    }
    
    for i := 0; i < val.NumField(); i++ {
        field := val.Field(i)
        fieldType := typ.Field(i)
        
        // 获取json标签作为key
        jsonTag := fieldType.Tag.Get("json")
        key := fieldType.Name
        if jsonTag != "" && jsonTag != "-" {
            key = strings.Split(jsonTag, ",")[0]
        }
        
        result[key] = field.Interface()
    }
    
    return result
}

// 动态调用方法
type Calculator struct{}

func (c *Calculator) Add(a, b int) int {
    return a + b
}

func (c *Calculator) Multiply(a, b int) int {
    return a * b
}

func (c *Calculator) Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("division by zero")
    }
    return a / b, nil
}

func CallMethodByName(obj interface{}, methodName string, args ...interface{}) []reflect.Value {
    val := reflect.ValueOf(obj)
    method := val.MethodByName(methodName)
    
    if !method.IsValid() {
        fmt.Printf("Method %s not found\n", methodName)
        return nil
    }
    
    // 转换参数为reflect.Value
    in := make([]reflect.Value, len(args))
    for i, arg := range args {
        in[i] = reflect.ValueOf(arg)
    }
    
    // 调用方法
    return method.Call(in)
}

func main() {
    fmt.Println("=== 反射应用演示 ===")
    
    // 1. 验证器示例
    user1 := User{
        ID:       1,
        Name:     "张三",
        Email:    "zhangsan@example.com",
        Age:      25,
        IsActive: true,
    }
    
    user2 := User{
        ID:    2,
        Name:  "李", // 太短
        Email: "invalid-email", // 无效邮箱
        Age:   -5, // 负数年龄
    }
    
    validator := &Validator{}
    
    fmt.Println("验证用户1:")
    errors1 := validator.Validate(user1)
    if len(errors1) == 0 {
        fmt.Println("验证通过")
    } else {
        for _, err := range errors1 {
            fmt.Println("- " + err)
        }
    }
    
    fmt.Println("\n验证用户2:")
    errors2 := validator.Validate(user2)
    for _, err := range errors2 {
        fmt.Println("- " + err)
    }
    
    // 2. 结构体转Map
    fmt.Println("\n结构体转Map:")
    userMap := StructToMap(user1)
    for k, v := range userMap {
        fmt.Printf("%s: %v\n", k, v)
    }
    
    // 3. 动态方法调用
    fmt.Println("\n动态方法调用:")
    calc := &Calculator{}
    
    // 调用Add方法
    result := CallMethodByName(calc, "Add", 10, 20)
    if len(result) > 0 {
        fmt.Printf("Add(10, 20) = %v\n", result[0].Interface())
    }
    
    // 调用Multiply方法
    result = CallMethodByName(calc, "Multiply", 6, 7)
    if len(result) > 0 {
        fmt.Printf("Multiply(6, 7) = %v\n", result[0].Interface())
    }
    
    // 调用Divide方法
    result = CallMethodByName(calc, "Divide", 15.0, 3.0)
    if len(result) > 0 {
        fmt.Printf("Divide(15.0, 3.0) = %v\n", result[0].Interface())
        if len(result) > 1 && !result[1].IsNil() {
            fmt.Printf("Error: %v\n", result[1].Interface())
        }
    }
}
```

##### 练习2: 高级接口模式
```go
// advanced_interfaces.go
package main

import (
    "fmt"
    "io"
    "strings"
)

// 策略模式
type PaymentStrategy interface {
    Pay(amount float64) error
    GetName() string
}

type CreditCardPayment struct {
    CardNumber string
}

func (c *CreditCardPayment) Pay(amount float64) error {
    fmt.Printf("使用信用卡 %s 支付 %.2f 元\n", c.maskCard(), amount)
    return nil
}

func (c *CreditCardPayment) GetName() string {
    return "信用卡支付"
}

func (c *CreditCardPayment) maskCard() string {
    if len(c.CardNumber) < 4 {
        return c.CardNumber
    }
    return "****" + c.CardNumber[len(c.CardNumber)-4:]
}

type AlipayPayment struct {
    Account string
}

func (a *AlipayPayment) Pay(amount float64) error {
    fmt.Printf("使用支付宝账户 %s 支付 %.2f 元\n", a.Account, amount)
    return nil
}

func (a *AlipayPayment) GetName() string {
    return "支付宝支付"
}

type WechatPayment struct {
    OpenID string
}

func (w *WechatPayment) Pay(amount float64) error {
    fmt.Printf("使用微信支付 %s 支付 %.2f 元\n", w.OpenID, amount)
    return nil
}

func (w *WechatPayment) GetName() string {
    return "微信支付"
}

// 支付上下文
type PaymentContext struct {
    strategy PaymentStrategy
}

func NewPaymentContext(strategy PaymentStrategy) *PaymentContext {
    return &PaymentContext{strategy: strategy}
}

func (p *PaymentContext) SetStrategy(strategy PaymentStrategy) {
    p.strategy = strategy
}

func (p *PaymentContext) ExecutePayment(amount float64) error {
    if p.strategy == nil {
        return fmt.Errorf("payment strategy not set")
    }
    
    fmt.Printf("选择支付方式: %s\n", p.strategy.GetName())
    return p.strategy.Pay(amount)
}

// 装饰器模式
type Coffee interface {
    Cost() float64
    Description() string
}

// 基础咖啡
type SimpleCoffee struct{}

func (s *SimpleCoffee) Cost() float64 {
    return 10.0
}

func (s *SimpleCoffee) Description() string {
    return "简单咖啡"
}

// 装饰器基类
type CoffeeDecorator struct {
    coffee Coffee
}

func (c *CoffeeDecorator) Cost() float64 {
    return c.coffee.Cost()
}

func (c *CoffeeDecorator) Description() string {
    return c.coffee.Description()
}

// 牛奶装饰器
type MilkDecorator struct {
    *CoffeeDecorator
}

func NewMilkDecorator(coffee Coffee) *MilkDecorator {
    return &MilkDecorator{
        CoffeeDecorator: &CoffeeDecorator{coffee: coffee},
    }
}

func (m *MilkDecorator) Cost() float64 {
    return m.coffee.Cost() + 2.0
}

func (m *MilkDecorator) Description() string {
    return m.coffee.Description() + " + 牛奶"
}

// 糖装饰器
type SugarDecorator struct {
    *CoffeeDecorator
}

func NewSugarDecorator(coffee Coffee) *SugarDecorator {
    return &SugarDecorator{
        CoffeeDecorator: &CoffeeDecorator{coffee: coffee},
    }
}

func (s *SugarDecorator) Cost() float64 {
    return s.coffee.Cost() + 1.0
}

func (s *SugarDecorator) Description() string {
    return s.coffee.Description() + " + 糖"
}

// 观察者模式
type Observer interface {
    Update(data interface{})
    GetID() string
}

type Subject interface {
    Attach(observer Observer)
    Detach(observer Observer)
    Notify(data interface{})
}

type EventPublisher struct {
    observers []Observer
}

func (e *EventPublisher) Attach(observer Observer) {
    e.observers = append(e.observers, observer)
}

func (e *EventPublisher) Detach(observer Observer) {
    for i, obs := range e.observers {
        if obs.GetID() == observer.GetID() {
            e.observers = append(e.observers[:i], e.observers[i+1:]...)
            break
        }
    }
}

func (e *EventPublisher) Notify(data interface{}) {
    for _, observer := range e.observers {
        observer.Update(data)
    }
}

// 具体观察者
type EmailNotifier struct {
    ID    string
    Email string
}

func (e *EmailNotifier) Update(data interface{}) {
    fmt.Printf("邮件通知 [%s]: 收到数据 %v，发送到 %s\n", e.ID, data, e.Email)
}

func (e *EmailNotifier) GetID() string {
    return e.ID
}

type SMSNotifier struct {
    ID    string
    Phone string
}

func (s *SMSNotifier) Update(data interface{}) {
    fmt.Printf("短信通知 [%s]: 收到数据 %v，发送到 %s\n", s.ID, data, s.Phone)
}

func (s *SMSNotifier) GetID() string {
    return s.ID
}

// 适配器模式
type OldPrinter struct{}

func (o *OldPrinter) PrintOld(text string) {
    fmt.Printf("[旧打印机] %s\n", text)
}

type NewPrinter interface {
    Print(content io.Reader)
}

type PrinterAdapter struct {
    oldPrinter *OldPrinter
}

func NewPrinterAdapter(oldPrinter *OldPrinter) *PrinterAdapter {
    return &PrinterAdapter{oldPrinter: oldPrinter}
}

func (p *PrinterAdapter) Print(content io.Reader) {
    // 读取内容并适配到旧接口
    var builder strings.Builder
    io.Copy(&builder, content)
    p.oldPrinter.PrintOld(builder.String())
}

func main() {
    fmt.Println("=== 高级接口模式演示 ===")
    
    // 1. 策略模式
    fmt.Println("\n1. 策略模式演示:")
    paymentContext := NewPaymentContext(nil)
    
    // 信用卡支付
    creditCard := &CreditCardPayment{CardNumber: "1234567890123456"}
    paymentContext.SetStrategy(creditCard)
    paymentContext.ExecutePayment(100.0)
    
    // 支付宝支付
    alipay := &AlipayPayment{Account: "user@example.com"}
    paymentContext.SetStrategy(alipay)
    paymentContext.ExecutePayment(200.0)
    
    // 微信支付
    wechat := &WechatPayment{OpenID: "wx123456"}
    paymentContext.SetStrategy(wechat)
    paymentContext.ExecutePayment(150.0)
    
    // 2. 装饰器模式
    fmt.Println("\n2. 装饰器模式演示:")
    
    coffee := &SimpleCoffee{}
    fmt.Printf("%s: %.2f 元\n", coffee.Description(), coffee.Cost())
    
    milkCoffee := NewMilkDecorator(coffee)
    fmt.Printf("%s: %.2f 元\n", milkCoffee.Description(), milkCoffee.Cost())
    
    milkSugarCoffee := NewSugarDecorator(milkCoffee)
    fmt.Printf("%s: %.2f 元\n", milkSugarCoffee.Description(), milkSugarCoffee.Cost())
    
    // 3. 观察者模式
    fmt.Println("\n3. 观察者模式演示:")
    publisher := &EventPublisher{}
    
    emailNotifier := &EmailNotifier{ID: "email1", Email: "user1@example.com"}
    smsNotifier := &SMSNotifier{ID: "sms1", Phone: "13800138000"}
    
    publisher.Attach(emailNotifier)
    publisher.Attach(smsNotifier)
    
    publisher.Notify("新订单创建")
    
    publisher.Detach(emailNotifier)
    publisher.Notify("订单状态更新")
    
    // 4. 适配器模式
    fmt.Println("\n4. 适配器模式演示:")
    oldPrinter := &OldPrinter{}
    adapter := NewPrinterAdapter(oldPrinter)
    
    content := strings.NewReader("这是要打印的内容")
    adapter.Print(content)
}
```

#### 🎯 学习要点
1. **反射验证**: 利用结构体标签实现通用验证器
2. **动态调用**: 通过反射实现方法的动态调用
3. **设计模式**: 策略、装饰器、观察者、适配器模式的Go实现
4. **接口组合**: 小接口组合实现复杂功能

---

### Day 3: 内存管理和性能优化

#### 📖 核心概念
- GC机制和内存分配
- 内存逃逸分析
- sync.Pool对象池
- pprof性能分析

#### 💻 实战代码

##### 练习1: 内存优化实践
```go
// memory_optimization.go
package main

import (
    "fmt"
    "runtime"
    "sync"
    "time"
)

// 对象池模式
type Buffer struct {
    data []byte
}

func (b *Buffer) Reset() {
    b.data = b.data[:0] // 重置长度但保留容量
}

func (b *Buffer) Write(p []byte) {
    b.data = append(b.data, p...)
}

func (b *Buffer) Bytes() []byte {
    return b.data
}

// 使用sync.Pool优化内存分配
var bufferPool = sync.Pool{
    New: func() interface{} {
        return &Buffer{
            data: make([]byte, 0, 1024), // 预分配1KB容量
        }
    },
}

func getBuf() *Buffer {
    return bufferPool.Get().(*Buffer)
}

func putBuf(buf *Buffer) {
    buf.Reset()
    bufferPool.Put(buf)
}

// 不使用对象池的版本（对比）
func processDataWithoutPool(data []byte) []byte {
    buf := &Buffer{data: make([]byte, 0, len(data)*2)}
    buf.Write(data)
    buf.Write([]byte(" - processed"))
    return buf.Bytes()
}

// 使用对象池的版本
func processDataWithPool(data []byte) []byte {
    buf := getBuf()
    defer putBuf(buf)
    
    buf.Write(data)
    buf.Write([]byte(" - processed"))
    
    // 复制数据，因为buffer会被重用
    result := make([]byte, len(buf.Bytes()))
    copy(result, buf.Bytes())
    return result
}

// 内存逃逸示例
func createSliceOnStack(size int) {
    // 小切片，通常分配在栈上
    slice := make([]int, size)
    _ = slice
}

func createSliceOnHeap() *[]int {
    // 返回指针，会逃逸到堆上
    slice := make([]int, 100)
    return &slice
}

// 字符串构建优化
func inefficientStringConcat(strs []string) string {
    var result string
    for _, str := range strs {
        result += str // 每次都会创建新的字符串
    }
    return result
}

func efficientStringConcat(strs []string) string {
    var total int
    for _, str := range strs {
        total += len(str)
    }
    
    // 预分配容量
    buf := make([]byte, 0, total)
    for _, str := range strs {
        buf = append(buf, str...)
    }
    return string(buf)
}

// 内存统计
type MemStats struct {
    Alloc        uint64
    TotalAlloc   uint64
    Sys          uint64
    NumGC        uint32
    PauseTotalNs uint64
}

func getMemStats() MemStats {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    return MemStats{
        Alloc:        m.Alloc,
        TotalAlloc:   m.TotalAlloc,
        Sys:          m.Sys,
        NumGC:        m.NumGC,
        PauseTotalNs: m.PauseTotalNs,
    }
}

func printMemStats(label string) {
    stats := getMemStats()
    fmt.Printf("%s - 内存统计:\n", label)
    fmt.Printf("  当前分配: %d KB\n", stats.Alloc/1024)
    fmt.Printf("  累计分配: %d KB\n", stats.TotalAlloc/1024)
    fmt.Printf("  系统内存: %d KB\n", stats.Sys/1024)
    fmt.Printf("  GC次数: %d\n", stats.NumGC)
    fmt.Printf("  GC暂停时间: %d μs\n", stats.PauseTotalNs/1000)
    fmt.Println()
}

func benchmarkObjectPool() {
    fmt.Println("=== 对象池性能测试 ===")
    
    testData := []byte("这是测试数据")
    iterations := 100000
    
    // 不使用对象池
    printMemStats("测试开始")
    
    start := time.Now()
    for i := 0; i < iterations; i++ {
        result := processDataWithoutPool(testData)
        _ = result
    }
    duration1 := time.Since(start)
    
    runtime.GC()
    printMemStats("不使用对象池")
    
    // 使用对象池
    start = time.Now()
    for i := 0; i < iterations; i++ {
        result := processDataWithPool(testData)
        _ = result
    }
    duration2 := time.Since(start)
    
    runtime.GC()
    printMemStats("使用对象池")
    
    fmt.Printf("不使用对象池耗时: %v\n", duration1)
    fmt.Printf("使用对象池耗时: %v\n", duration2)
    fmt.Printf("性能提升: %.2f%%\n", float64(duration1-duration2)/float64(duration1)*100)
}

func benchmarkStringConcat() {
    fmt.Println("\n=== 字符串拼接性能测试 ===")
    
    strs := make([]string, 1000)
    for i := range strs {
        strs[i] = fmt.Sprintf("字符串%d", i)
    }
    
    printMemStats("字符串测试开始")
    
    // 低效方式
    start := time.Now()
    result1 := inefficientStringConcat(strs)
    duration1 := time.Since(start)
    
    runtime.GC()
    printMemStats("低效字符串拼接")
    
    // 高效方式
    start = time.Now()
    result2 := efficientStringConcat(strs)
    duration2 := time.Since(start)
    
    runtime.GC()
    printMemStats("高效字符串拼接")
    
    fmt.Printf("结果长度一致: %t\n", len(result1) == len(result2))
    fmt.Printf("低效方式耗时: %v\n", duration1)
    fmt.Printf("高效方式耗时: %v\n", duration2)
    fmt.Printf("性能提升: %.2f%%\n", float64(duration1-duration2)/float64(duration1)*100)
}

func main() {
    fmt.Println("Go内存管理和性能优化演示")
    fmt.Printf("Go版本: %s\n", runtime.Version())
    fmt.Printf("GOMAXPROCS: %d\n", runtime.GOMAXPROCS(0))
    
    benchmarkObjectPool()
    benchmarkStringConcat()
}
```

##### 练习2: pprof性能分析
```go
// performance_profiling.go
package main

import (
    "context"
    "fmt"
    "math/rand"
    "net/http"
    _ "net/http/pprof" // 导入pprof
    "runtime"
    "sync"
    "time"
)

// CPU密集型任务
func cpuIntensiveTask(n int) int64 {
    var sum int64
    for i := 0; i < n; i++ {
        sum += int64(i * i)
    }
    return sum
}

// 内存密集型任务
func memoryIntensiveTask() [][]int {
    var data [][]int
    for i := 0; i < 1000; i++ {
        row := make([]int, 1000)
        for j := range row {
            row[j] = rand.Intn(100)
        }
        data = append(data, row)
    }
    return data
}

// 并发任务
func concurrentTask(ctx context.Context) {
    var wg sync.WaitGroup
    
    for i := 0; i < 10; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            
            for {
                select {
                case <-ctx.Done():
                    return
                default:
                    // 执行一些工作
                    result := cpuIntensiveTask(10000)
                    _ = result
                    time.Sleep(time.Millisecond * 10)
                }
            }
        }(i)
    }
    
    wg.Wait()
}

// 模拟Web服务器
func setupWebServer() {
    // CPU Profile 端点
    http.HandleFunc("/cpu", func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        result := cpuIntensiveTask(1000000)
        duration := time.Since(start)
        
        fmt.Fprintf(w, "CPU任务完成，结果: %d，耗时: %v\n", result, duration)
    })
    
    // 内存 Profile 端点
    http.HandleFunc("/memory", func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        data := memoryIntensiveTask()
        duration := time.Since(start)
        
        fmt.Fprintf(w, "内存任务完成，数据大小: %dx%d，耗时: %v\n", 
            len(data), len(data[0]), duration)
    })
    
    // 并发任务端点
    http.HandleFunc("/concurrent", func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        defer cancel()
        
        start := time.Now()
        concurrentTask(ctx)
        duration := time.Since(start)
        
        fmt.Fprintf(w, "并发任务完成，耗时: %v\n", duration)
    })
    
    // 状态信息端点
    http.HandleFunc("/stats", func(w http.ResponseWriter, r *http.Request) {
        var m runtime.MemStats
        runtime.ReadMemStats(&m)
        
        fmt.Fprintf(w, "内存统计信息:\n")
        fmt.Fprintf(w, "当前分配: %d KB\n", m.Alloc/1024)
        fmt.Fprintf(w, "累计分配: %d KB\n", m.TotalAlloc/1024)
        fmt.Fprintf(w, "系统内存: %d KB\n", m.Sys/1024)
        fmt.Fprintf(w, "GC次数: %d\n", m.NumGC)
        fmt.Fprintf(w, "Goroutine数量: %d\n", runtime.NumGoroutine())
    })
    
    // 垃圾回收端点
    http.HandleFunc("/gc", func(w http.ResponseWriter, r *http.Request) {
        var before runtime.MemStats
        runtime.ReadMemStats(&before)
        
        start := time.Now()
        runtime.GC()
        duration := time.Since(start)
        
        var after runtime.MemStats
        runtime.ReadMemStats(&after)
        
        fmt.Fprintf(w, "GC执行完成:\n")
        fmt.Fprintf(w, "耗时: %v\n", duration)
        fmt.Fprintf(w, "GC前内存: %d KB\n", before.Alloc/1024)
        fmt.Fprintf(w, "GC后内存: %d KB\n", after.Alloc/1024)
        fmt.Fprintf(w, "释放内存: %d KB\n", (before.Alloc-after.Alloc)/1024)
    })
    
    fmt.Println("性能分析服务器启动在 :8080")
    fmt.Println("访问以下URL进行测试:")
    fmt.Println("  http://localhost:8080/cpu - CPU密集型任务")
    fmt.Println("  http://localhost:8080/memory - 内存密集型任务")
    fmt.Println("  http://localhost:8080/concurrent - 并发任务")
    fmt.Println("  http://localhost:8080/stats - 内存统计")
    fmt.Println("  http://localhost:8080/gc - 手动垃圾回收")
    fmt.Println("\npprof分析端点:")
    fmt.Println("  http://localhost:8080/debug/pprof/ - pprof首页")
    fmt.Println("  http://localhost:8080/debug/pprof/profile - CPU profile")
    fmt.Println("  http://localhost:8080/debug/pprof/heap - 内存 profile")
    fmt.Println("  http://localhost:8080/debug/pprof/goroutine - Goroutine profile")
}

// 性能基准测试函数
func runBenchmarks() {
    fmt.Println("=== 性能基准测试 ===")
    
    // CPU基准测试
    fmt.Println("1. CPU密集型任务基准:")
    sizes := []int{10000, 50000, 100000}
    
    for _, size := range sizes {
        start := time.Now()
        result := cpuIntensiveTask(size)
        duration := time.Since(start)
        fmt.Printf("  大小 %d: 结果=%d, 耗时=%v\n", size, result, duration)
    }
    
    // 内存分配基准测试
    fmt.Println("\n2. 内存分配基准:")
    
    var memBefore runtime.MemStats
    runtime.ReadMemStats(&memBefore)
    
    start := time.Now()
    data := memoryIntensiveTask()
    duration := time.Since(start)
    
    var memAfter runtime.MemStats
    runtime.ReadMemStats(&memAfter)
    
    fmt.Printf("  数据大小: %dx%d\n", len(data), len(data[0]))
    fmt.Printf("  耗时: %v\n", duration)
    fmt.Printf("  分配内存: %d KB\n", (memAfter.TotalAlloc-memBefore.TotalAlloc)/1024)
    
    // 清理内存
    data = nil
    runtime.GC()
    
    // 并发基准测试
    fmt.Println("\n3. 并发性能基准:")
    
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()
    
    start = time.Now()
    concurrentTask(ctx)
    duration = time.Since(start)
    
    fmt.Printf("  并发任务耗时: %v\n", duration)
    fmt.Printf("  当前Goroutine数量: %d\n", runtime.NumGoroutine())
}

func main() {
    fmt.Println("Go性能分析工具演示")
    fmt.Printf("Go版本: %s\n", runtime.Version())
    
    // 设置随机种子
    rand.Seed(time.Now().UnixNano())
    
    // 运行基准测试
    runBenchmarks()
    
    fmt.Println("\n启动Web服务器进行pprof分析...")
    
    // 启动后台任务生成负载
    go func() {
        ticker := time.NewTicker(1 * time.Second)
        defer ticker.Stop()
        
        for range ticker.C {
            go func() {
                _ = cpuIntensiveTask(50000)
            }()
            
            go func() {
                data := memoryIntensiveTask()
                _ = data
                // 让数据存在一段时间后清理
                time.Sleep(2 * time.Second)
                data = nil
            }()
        }
    }()
    
    // 设置并启动Web服务器
    setupWebServer()
    http.ListenAndServe(":8080", nil)
}
```

#### 📋 pprof使用指南

```bash
# 1. 启动程序后，访问以下命令进行性能分析

# CPU Profile (采样30秒)
go tool pprof http://localhost:8080/debug/pprof/profile?seconds=30

# 内存 Profile
go tool pprof http://localhost:8080/debug/pprof/heap

# Goroutine Profile
go tool pprof http://localhost:8080/debug/pprof/goroutine

# 2. 在pprof交互模式中使用的命令:
# top - 显示占用最多的函数
# list 函数名 - 显示函数的源代码和性能数据  
# web - 在浏览器中显示调用图（需要安装graphviz）
# svg - 生成SVG格式的调用图
# exit - 退出

# 3. 生成性能报告文件
go tool pprof -http=:8081 profile.pb.gz
```

#### 🎯 学习要点
1. **对象池**: 使用sync.Pool减少内存分配
2. **内存逃逸**: 理解栈和堆的分配策略
3. **字符串优化**: 预分配容量避免重复分配
4. **pprof分析**: 使用工具定位性能瓶颈
5. **GC调优**: 理解垃圾回收的影响

---

### Day 4: Web框架深入 - Gin高级用法

#### 📖 核心概念
- Gin框架架构
- 中间件设计和实现
- 请求绑定和验证
- 自定义路由和组
- WebSocket集成

#### 💻 实战代码

##### 练习1: Gin高级特性
```go
// gin_advanced.go
package main

import (
    "fmt"
    "net/http"
    "strconv"
    "time"
    
    "github.com/gin-gonic/gin"
    "github.com/gin-gonic/gin/binding"
    "gopkg.in/go-playground/validator.v9"
)

// 自定义验证器
func customValidator(fl validator.FieldLevel) bool {
    return len(fl.Field().String()) >= 2
}

// 请求/响应结构体
type CreateUserRequest struct {
    Name     string `json:"name" binding:"required,min=2" validate:"customName"`
    Email    string `json:"email" binding:"required,email"`
    Age      int    `json:"age" binding:"required,gte=18,lte=100"`
    Password string `json:"password" binding:"required,min=6"`
}

type User struct {
    ID       int       `json:"id"`
    Name     string    `json:"name"`
    Email    string    `json:"email"`
    Age      int       `json:"age"`
    CreateAt time.Time `json:"create_at"`
}

type APIResponse struct {
    Code    int         `json:"code"`
    Message string      `json:"message"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

// 内存存储 (实际应用中应该使用数据库)
var (
    users  = make(map[int]*User)
    nextID = 1
)

// 自定义中间件
func LoggerMiddleware() gin.HandlerFunc {
    return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
        return fmt.Sprintf("[%s] %s %s %d %s %s\n",
            param.TimeStamp.Format("2006-01-02 15:04:05"),
            param.Method,
            param.Path,
            param.StatusCode,
            param.Latency,
            param.ClientIP,
        )
    })
}

func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, APIResponse{
                Code:    401,
                Message: "Missing authorization token",
            })
            c.Abort()
            return
        }
        
        // 简单的token验证 (实际应用中应该验证JWT等)
        if token != "Bearer valid-token" {
            c.JSON(http.StatusUnauthorized, APIResponse{
                Code:    401,
                Message: "Invalid token",
            })
            c.Abort()
            return
        }
        
        // 将用户信息设置到上下文
        c.Set("userID", 1)
        c.Set("userName", "admin")
        c.Next()
    }
}

func RateLimitMiddleware() gin.HandlerFunc {
    // 简单的内存限流 (实际应用中应该使用Redis等)
    requests := make(map[string][]time.Time)
    
    return func(c *gin.Context) {
        clientIP := c.ClientIP()
        now := time.Now()
        
        // 清理过期的请求记录
        if times, exists := requests[clientIP]; exists {
            var validTimes []time.Time
            for _, t := range times {
                if now.Sub(t) < time.Minute {
                    validTimes = append(validTimes, t)
                }
            }
            requests[clientIP] = validTimes
        }
        
        // 检查请求频率 (每分钟最多10次请求)
        if len(requests[clientIP]) >= 10 {
            c.JSON(http.StatusTooManyRequests, APIResponse{
                Code:    429,
                Message: "Too many requests",
            })
            c.Abort()
            return
        }
        
        // 记录当前请求
        requests[clientIP] = append(requests[clientIP], now)
        c.Next()
    }
}

func CORSMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Header("Access-Control-Allow-Origin", "*")
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusOK)
            return
        }
        
        c.Next()
    }
}

// 控制器
func createUser(c *gin.Context) {
    var req CreateUserRequest
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, APIResponse{
            Code:    400,
            Message: "Invalid request data",
            Error:   err.Error(),
        })
        return
    }
    
    // 检查邮箱是否已存在
    for _, user := range users {
        if user.Email == req.Email {
            c.JSON(http.StatusConflict, APIResponse{
                Code:    409,
                Message: "Email already exists",
            })
            return
        }
    }
    
    // 创建用户
    user := &User{
        ID:       nextID,
        Name:     req.Name,
        Email:    req.Email,
        Age:      req.Age,
        CreateAt: time.Now(),
    }
    users[nextID] = user
    nextID++
    
    c.JSON(http.StatusCreated, APIResponse{
        Code:    201,
        Message: "User created successfully",
        Data:    user,
    })
}

func getUser(c *gin.Context) {
    idParam := c.Param("id")
    id, err := strconv.Atoi(idParam)
    if err != nil {
        c.JSON(http.StatusBadRequest, APIResponse{
            Code:    400,
            Message: "Invalid user ID",
        })
        return
    }
    
    user, exists := users[id]
    if !exists {
        c.JSON(http.StatusNotFound, APIResponse{
            Code:    404,
            Message: "User not found",
        })
        return
    }
    
    c.JSON(http.StatusOK, APIResponse{
        Code:    200,
        Message: "Success",
        Data:    user,
    })
}

func listUsers(c *gin.Context) {
    // 分页参数
    pageStr := c.DefaultQuery("page", "1")
    limitStr := c.DefaultQuery("limit", "10")
    
    page, _ := strconv.Atoi(pageStr)
    limit, _ := strconv.Atoi(limitStr)
    
    if page < 1 {
        page = 1
    }
    if limit < 1 {
        limit = 10
    }
    
    // 简单分页 (实际应用中应该在数据库层面处理)
    var userList []*User
    for _, user := range users {
        userList = append(userList, user)
    }
    
    start := (page - 1) * limit
    end := start + limit
    
    if start >= len(userList) {
        userList = []*User{}
    } else if end > len(userList) {
        userList = userList[start:]
    } else {
        userList = userList[start:end]
    }
    
    c.JSON(http.StatusOK, APIResponse{
        Code:    200,
        Message: "Success",
        Data: map[string]interface{}{
            "users": userList,
            "page":  page,
            "limit": limit,
            "total": len(users),
        },
    })
}

func updateUser(c *gin.Context) {
    idParam := c.Param("id")
    id, err := strconv.Atoi(idParam)
    if err != nil {
        c.JSON(http.StatusBadRequest, APIResponse{
            Code:    400,
            Message: "Invalid user ID",
        })
        return
    }
    
    user, exists := users[id]
    if !exists {
        c.JSON(http.StatusNotFound, APIResponse{
            Code:    404,
            Message: "User not found",
        })
        return
    }
    
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, APIResponse{
            Code:    400,
            Message: "Invalid request data",
            Error:   err.Error(),
        })
        return
    }
    
    // 检查邮箱冲突 (排除当前用户)
    for uid, u := range users {
        if uid != id && u.Email == req.Email {
            c.JSON(http.StatusConflict, APIResponse{
                Code:    409,
                Message: "Email already exists",
            })
            return
        }
    }
    
    // 更新用户信息
    user.Name = req.Name
    user.Email = req.Email
    user.Age = req.Age
    
    c.JSON(http.StatusOK, APIResponse{
        Code:    200,
        Message: "User updated successfully",
        Data:    user,
    })
}

func deleteUser(c *gin.Context) {
    idParam := c.Param("id")
    id, err := strconv.Atoi(idParam)
    if err != nil {
        c.JSON(http.StatusBadRequest, APIResponse{
            Code:    400,
            Message: "Invalid user ID",
        })
        return
    }
    
    _, exists := users[id]
    if !exists {
        c.JSON(http.StatusNotFound, APIResponse{
            Code:    404,
            Message: "User not found",
        })
        return
    }
    
    delete(users, id)
    
    c.JSON(http.StatusOK, APIResponse{
        Code:    200,
        Message: "User deleted successfully",
    })
}

// 健康检查
func healthCheck(c *gin.Context) {
    c.JSON(http.StatusOK, APIResponse{
        Code:    200,
        Message: "Service is healthy",
        Data: map[string]interface{}{
            "timestamp": time.Now(),
            "version":   "1.0.0",
            "users":     len(users),
        },
    })
}

func setupRouter() *gin.Engine {
    // 设置Gin模式
    gin.SetMode(gin.ReleaseMode)
    
    r := gin.New()
    
    // 注册自定义验证器
    if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
        v.RegisterValidation("customName", customValidator)
    }
    
    // 全局中间件
    r.Use(LoggerMiddleware())
    r.Use(CORSMiddleware())
    r.Use(gin.Recovery())
    
    // 公开API
    public := r.Group("/api/v1")
    {
        public.GET("/health", healthCheck)
    }
    
    // 需要认证的API
    private := r.Group("/api/v1")
    private.Use(AuthMiddleware())
    private.Use(RateLimitMiddleware())
    {
        // 用户相关路由
        users := private.Group("/users")
        {
            users.POST("", createUser)
            users.GET("", listUsers)
            users.GET("/:id", getUser)
            users.PUT("/:id", updateUser)
            users.DELETE("/:id", deleteUser)
        }
    }
    
    return r
}

func main() {
    fmt.Println("启动Gin高级Web服务器...")
    
    router := setupRouter()
    
    fmt.Println("服务器运行在: http://localhost:8080")
    fmt.Println("API文档:")
    fmt.Println("  GET    /api/v1/health           - 健康检查")
    fmt.Println("  POST   /api/v1/users            - 创建用户")
    fmt.Println("  GET    /api/v1/users            - 获取用户列表")
    fmt.Println("  GET    /api/v1/users/:id        - 获取单个用户")
    fmt.Println("  PUT    /api/v1/users/:id        - 更新用户")
    fmt.Println("  DELETE /api/v1/users/:id        - 删除用户")
    fmt.Println("\n认证信息: Authorization: Bearer valid-token")
    
    router.Run(":8080")
}
```

##### 练习2: WebSocket实时通信
```go
// websocket_server.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"
    "sync"
    "time"
    
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
)

// WebSocket升级器
var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // 允许所有来源，生产环境应该检查Origin
    },
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}

// 消息类型
type MessageType string

const (
    TypeJoin      MessageType = "join"
    TypeLeave     MessageType = "leave"
    TypeMessage   MessageType = "message"
    TypeBroadcast MessageType = "broadcast"
    TypeUserList  MessageType = "user_list"
    TypeError     MessageType = "error"
)

// WebSocket消息结构
type WSMessage struct {
    Type      MessageType `json:"type"`
    From      string      `json:"from,omitempty"`
    To        string      `json:"to,omitempty"`
    Content   string      `json:"content"`
    Timestamp time.Time   `json:"timestamp"`
    UserCount int         `json:"user_count,omitempty"`
    Users     []string    `json:"users,omitempty"`
}

// 客户端连接
type Client struct {
    ID       string
    Name     string
    Conn     *websocket.Conn
    Send     chan WSMessage
    Hub      *Hub
    JoinTime time.Time
}

// 连接中心
type Hub struct {
    clients    map[*Client]bool
    broadcast  chan WSMessage
    register   chan *Client
    unregister chan *Client
    mutex      sync.RWMutex
}

// 创建Hub
func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        broadcast:  make(chan WSMessage),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

// 运行Hub
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mutex.Lock()
            h.clients[client] = true
            h.mutex.Unlock()
            
            // 发送用户列表给新用户
            h.sendUserList()
            
            // 广播用户加入消息
            joinMsg := WSMessage{
                Type:      TypeJoin,
                From:      "system",
                Content:   fmt.Sprintf("%s 加入了聊天室", client.Name),
                Timestamp: time.Now(),
                UserCount: len(h.clients),
            }
            h.broadcastMessage(joinMsg)
            
            log.Printf("用户 %s (%s) 连接", client.Name, client.ID)
            
        case client := <-h.unregister:
            h.mutex.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.Send)
                h.mutex.Unlock()
                
                // 广播用户离开消息
                leaveMsg := WSMessage{
                    Type:      TypeLeave,
                    From:      "system",
                    Content:   fmt.Sprintf("%s 离开了聊天室", client.Name),
                    Timestamp: time.Now(),
                    UserCount: len(h.clients),
                }
                h.broadcastMessage(leaveMsg)
                
                // 更新用户列表
                h.sendUserList()
                
                log.Printf("用户 %s (%s) 断开连接", client.Name, client.ID)
            } else {
                h.mutex.Unlock()
            }
            
        case message := <-h.broadcast:
            h.broadcastMessage(message)
        }
    }
}

// 广播消息给所有客户端
func (h *Hub) broadcastMessage(message WSMessage) {
    h.mutex.RLock()
    defer h.mutex.RUnlock()
    
    for client := range h.clients {
        select {
        case client.Send <- message:
        default:
            close(client.Send)
            delete(h.clients, client)
        }
    }
}

// 发送用户列表
func (h *Hub) sendUserList() {
    h.mutex.RLock()
    defer h.mutex.RUnlock()
    
    var users []string
    for client := range h.clients {
        users = append(users, client.Name)
    }
    
    userListMsg := WSMessage{
        Type:      TypeUserList,
        From:      "system",
        Users:     users,
        UserCount: len(users),
        Timestamp: time.Now(),
    }
    
    for client := range h.clients {
        select {
        case client.Send <- userListMsg:
        default:
            close(client.Send)
            delete(h.clients, client)
        }
    }
}

// 发送消息给特定用户
func (h *Hub) sendToUser(targetName string, message WSMessage) bool {
    h.mutex.RLock()
    defer h.mutex.RUnlock()
    
    for client := range h.clients {
        if client.Name == targetName {
            select {
            case client.Send <- message:
                return true
            default:
                return false
            }
        }
    }
    return false
}

// 读取客户端消息
func (c *Client) readPump() {
    defer func() {
        c.Hub.unregister <- c
        c.Conn.Close()
    }()
    
    // 设置读取超时
    c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    c.Conn.SetPongHandler(func(string) error {
        c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })
    
    for {
        _, messageData, err := c.Conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("WebSocket错误: %v", err)
            }
            break
        }
        
        var msg WSMessage
        if err := json.Unmarshal(messageData, &msg); err != nil {
            log.Printf("JSON解析错误: %v", err)
            continue
        }
        
        // 设置消息来源和时间戳
        msg.From = c.Name
        msg.Timestamp = time.Now()
        
        switch msg.Type {
        case TypeMessage:
            if msg.To != "" {
                // 私聊消息
                if !c.Hub.sendToUser(msg.To, msg) {
                    errorMsg := WSMessage{
                        Type:      TypeError,
                        From:      "system",
                        Content:   fmt.Sprintf("用户 %s 不在线", msg.To),
                        Timestamp: time.Now(),
                    }
                    select {
                    case c.Send <- errorMsg:
                    default:
                        close(c.Send)
                        return
                    }
                }
            } else {
                // 公共消息
                msg.Type = TypeBroadcast
                c.Hub.broadcast <- msg
            }
        }
    }
}

// 写入消息到客户端
func (c *Client) writePump() {
    ticker := time.NewTicker(54 * time.Second)
    defer func() {
        ticker.Stop()
        c.Conn.Close()
    }()
    
    for {
        select {
        case message, ok := <-c.Send:
            c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if !ok {
                c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            
            if err := c.Conn.WriteJSON(message); err != nil {
                log.Printf("写入消息错误: %v", err)
                return
            }
            
        case <-ticker.C:
            c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// WebSocket处理器
func handleWebSocket(hub *Hub) gin.HandlerFunc {
    return func(c *gin.Context) {
        // 获取用户名参数
        name := c.Query("name")
        if name == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "name parameter required"})
            return
        }
        
        // 升级HTTP连接为WebSocket
        conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
        if err != nil {
            log.Printf("WebSocket升级失败: %v", err)
            return
        }
        
        // 创建客户端
        client := &Client{
            ID:       generateClientID(),
            Name:     name,
            Conn:     conn,
            Send:     make(chan WSMessage, 256),
            Hub:      hub,
            JoinTime: time.Now(),
        }
        
        // 注册客户端
        client.Hub.register <- client
        
        // 启动读写goroutine
        go client.writePump()
        go client.readPump()
    }
}

// 生成客户端ID
func generateClientID() string {
    return fmt.Sprintf("client_%d", time.Now().UnixNano())
}

// 聊天室统计信息
func getChatStats(hub *Hub) gin.HandlerFunc {
    return func(c *gin.Context) {
        hub.mutex.RLock()
        defer hub.mutex.RUnlock()
        
        var users []map[string]interface{}
        for client := range hub.clients {
            users = append(users, map[string]interface{}{
                "id":        client.ID,
                "name":      client.Name,
                "join_time": client.JoinTime,
                "online":    time.Since(client.JoinTime).String(),
            })
        }
        
        stats := map[string]interface{}{
            "online_users": len(hub.clients),
            "users":        users,
            "server_time":  time.Now(),
        }
        
        c.JSON(http.StatusOK, stats)
    }
}

// 发送系统广播
func sendSystemBroadcast(hub *Hub) gin.HandlerFunc {
    return func(c *gin.Context) {
        var req struct {
            Message string `json:"message" binding:"required"`
        }
        
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }
        
        broadcastMsg := WSMessage{
            Type:      TypeBroadcast,
            From:      "系统管理员",
            Content:   req.Message,
            Timestamp: time.Now(),
        }
        
        hub.broadcast <- broadcastMsg
        
        c.JSON(http.StatusOK, gin.H{
            "message": "广播消息已发送",
            "sent_at": time.Now(),
        })
    }
}

func main() {
    // 创建Hub并启动
    hub := NewHub()
    go hub.Run()
    
    // 设置Gin路由
    r := gin.Default()
    
    // 静态文件服务 (HTML客户端)
    r.LoadHTMLGlob("templates/*")
    r.Static("/static", "./static")
    
    // 聊天室首页
    r.GET("/", func(c *gin.Context) {
        c.HTML(http.StatusOK, "chat.html", gin.H{
            "title": "WebSocket聊天室",
        })
    })
    
    // WebSocket连接
    r.GET("/ws", handleWebSocket(hub))
    
    // API路由
    api := r.Group("/api")
    {
        api.GET("/stats", getChatStats(hub))
        api.POST("/broadcast", sendSystemBroadcast(hub))
    }
    
    fmt.Println("WebSocket聊天室服务器启动...")
    fmt.Println("访问: http://localhost:8080")
    fmt.Println("WebSocket连接: ws://localhost:8080/ws?name=你的名字")
    fmt.Println("统计信息: http://localhost:8080/api/stats")
    
    log.Fatal(http.ListenAndServe(":8080", r))
}
```

##### HTML客户端模板 (templates/chat.html)
```html
<!DOCTYPE html>
<html>
<head>
    <title>{{.title}}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .chat-box { 
            height: 400px; 
            border: 1px solid #ccc; 
            overflow-y: scroll; 
            padding: 10px; 
            margin-bottom: 10px; 
            background: #f9f9f9;
        }
        .message { margin-bottom: 10px; }
        .system { color: #666; font-style: italic; }
        .user { color: #333; }
        .private { color: #0066cc; }
        .input-group { display: flex; margin-bottom: 10px; }
        .input-group input { flex: 1; padding: 8px; margin-right: 10px; }
        .input-group button { padding: 8px 15px; }
        .user-list { 
            border: 1px solid #ccc; 
            padding: 10px; 
            max-height: 200px; 
            overflow-y: auto; 
            background: #f9f9f9;
        }
        .status { padding: 10px; background: #e8f4fd; border-radius: 4px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>WebSocket聊天室</h1>
        
        <div class="status" id="status">
            状态: 未连接
        </div>
        
        <div class="input-group">
            <input type="text" id="nameInput" placeholder="输入您的昵称" maxlength="20">
            <button onclick="connect()">连接</button>
            <button onclick="disconnect()">断开连接</button>
        </div>
        
        <div class="chat-box" id="chatBox"></div>
        
        <div class="input-group">
            <input type="text" id="messageInput" placeholder="输入消息..." disabled>
            <input type="text" id="targetInput" placeholder="私聊对象(可选)" style="max-width: 150px;">
            <button onclick="sendMessage()" disabled id="sendButton">发送</button>
        </div>
        
        <div class="user-list">
            <strong>在线用户:</strong>
            <div id="userList">暂无用户</div>
        </div>
    </div>

    <script>
        let ws = null;
        let connected = false;
        
        function connect() {
            const name = document.getElementById('nameInput').value.trim();
            if (!name) {
                alert('请输入昵称');
                return;
            }
            
            if (ws) {
                ws.close();
            }
            
            const wsUrl = `ws://localhost:8080/ws?name=${encodeURIComponent(name)}`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = function() {
                connected = true;
                updateStatus('已连接', 'green');
                document.getElementById('messageInput').disabled = false;
                document.getElementById('sendButton').disabled = false;
                document.getElementById('nameInput').disabled = true;
            };
            
            ws.onmessage = function(event) {
                const message = JSON.parse(event.data);
                handleMessage(message);
            };
            
            ws.onclose = function() {
                connected = false;
                updateStatus('连接已断开', 'red');
                document.getElementById('messageInput').disabled = true;
                document.getElementById('sendButton').disabled = true;
                document.getElementById('nameInput').disabled = false;
            };
            
            ws.onerror = function(error) {
                console.error('WebSocket错误:', error);
                updateStatus('连接错误', 'red');
            };
        }
        
        function disconnect() {
            if (ws) {
                ws.close();
            }
        }
        
        function sendMessage() {
            if (!connected || !ws) return;
            
            const content = document.getElementById('messageInput').value.trim();
            if (!content) return;
            
            const target = document.getElementById('targetInput').value.trim();
            
            const message = {
                type: 'message',
                content: content,
                to: target || undefined
            };
            
            ws.send(JSON.stringify(message));
            document.getElementById('messageInput').value = '';
        }
        
        function handleMessage(message) {
            const chatBox = document.getElementById('chatBox');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            
            const time = new Date(message.timestamp).toLocaleTimeString();
            
            switch (message.type) {
                case 'join':
                case 'leave':
                    messageDiv.className += ' system';
                    messageDiv.innerHTML = `[${time}] ${message.content}`;
                    break;
                    
                case 'broadcast':
                    messageDiv.className += ' user';
                    messageDiv.innerHTML = `[${time}] <strong>${message.from}:</strong> ${message.content}`;
                    break;
                    
                case 'message':
                    messageDiv.className += ' private';
                    messageDiv.innerHTML = `[${time}] <strong>${message.from} (私聊):</strong> ${message.content}`;
                    break;
                    
                case 'user_list':
                    updateUserList(message.users);
                    return;
                    
                case 'error':
                    messageDiv.className += ' system';
                    messageDiv.innerHTML = `[${time}] 错误: ${message.content}`;
                    messageDiv.style.color = 'red';
                    break;
            }
            
            chatBox.appendChild(messageDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
        
        function updateUserList(users) {
            const userListDiv = document.getElementById('userList');
            if (users && users.length > 0) {
                userListDiv.innerHTML = users.map(user => `<span style="margin-right: 10px; cursor: pointer;" onclick="setPrivateTarget('${user}')">${user}</span>`).join('');
            } else {
                userListDiv.innerHTML = '暂无用户';
            }
        }
        
        function setPrivateTarget(username) {
            document.getElementById('targetInput').value = username;
            document.getElementById('messageInput').focus();
        }
        
        function updateStatus(message, color) {
            const statusDiv = document.getElementById('status');
            statusDiv.innerHTML = `状态: ${message}`;
            statusDiv.style.backgroundColor = color === 'green' ? '#d4edda' : '#f8d7da';
            statusDiv.style.color = color === 'green' ? '#155724' : '#721c24';
        }
        
        // 回车发送消息
        document.getElementById('messageInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        document.getElementById('nameInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                connect();
            }
        });
    </script>
</body>
</html>
```

#### 🎯 学习要点
1. **中间件链**: 理解请求处理流程和中间件执行顺序
2. **请求验证**: 使用binding和validator进行数据验证
3. **路由分组**: 组织API结构和应用不同中间件
4. **WebSocket**: 实现实时双向通信
5. **错误处理**: 统一的错误响应格式

---

### Day 5: 数据库集成与ORM

#### 📖 核心概念
- GORM ORM框架
- 数据库连接池
- 事务处理
- 数据库迁移
- 查询优化

#### 💻 实战代码

##### 练习1: GORM基础应用
```go
// gorm_basic.go
package main

import (
    "fmt"
    "log"
    "time"
    
    "gorm.io/driver/sqlite"
    "gorm.io/gorm"
    "gorm.io/gorm/logger"
)

// 用户模型
type User struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Name      string    `gorm:"size:100;not null" json:"name"`
    Email     string    `gorm:"uniqueIndex;not null" json:"email"`
    Age       int       `gorm:"check:age >= 0" json:"age"`
    IsActive  bool      `gorm:"default:true" json:"is_active"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
    
    // 关联关系
    Profile *Profile `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"profile,omitempty"`
    Posts   []Post   `gorm:"foreignKey:UserID" json:"posts,omitempty"`
}

// 用户资料模型
type Profile struct {
    ID       uint   `gorm:"primaryKey" json:"id"`
    UserID   uint   `gorm:"uniqueIndex" json:"user_id"`
    Bio      string `gorm:"type:text" json:"bio"`
    Avatar   string `gorm:"size:255" json:"avatar"`
    Location string `gorm:"size:100" json:"location"`
    Website  string `gorm:"size:255" json:"website"`
    
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// 文章模型
type Post struct {
    ID        uint      `gorm:"primaryKey" json:"id"`
    Title     string    `gorm:"size:200;not null" json:"title"`
    Content   string    `gorm:"type:text" json:"content"`
    Status    string    `gorm:"size:20;default:draft" json:"status"`
    UserID    uint      `gorm:"not null;index" json:"user_id"`
    ViewCount int       `gorm:"default:0" json:"view_count"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    
    // 关联关系
    User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
    Tags []Tag `gorm:"many2many:post_tags;" json:"tags,omitempty"`
}

// 标签模型
type Tag struct {
    ID    uint   `gorm:"primaryKey" json:"id"`
    Name  string `gorm:"uniqueIndex;size:50" json:"name"`
    Color string `gorm:"size:7;default:#007bff" json:"color"`
    
    Posts []Post `gorm:"many2many:post_tags;" json:"posts,omitempty"`
}

// 数据库管理器
type Database struct {
    db *gorm.DB
}

func NewDatabase() *Database {
    // 配置日志
    newLogger := logger.New(
        log.New(log.Writer(), "\r\n", log.LstdFlags),
        logger.Config{
            SlowThreshold:             time.Second,
            LogLevel:                  logger.Info,
            IgnoreRecordNotFoundError: true,
            Colorful:                  false,
        },
    )
    
    // 连接数据库
    db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{
        Logger: newLogger,
    })
    if err != nil {
        log.Fatal("连接数据库失败:", err)
    }
    
    return &Database{db: db}
}

func (d *Database) AutoMigrate() error {
    return d.db.AutoMigrate(&User{}, &Profile{}, &Post{}, &Tag{})
}

// 用户服务
type UserService struct {
    db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
    return &UserService{db: db}
}

func (s *UserService) CreateUser(user *User) error {
    return s.db.Create(user).Error
}

func (s *UserService) GetUserByID(id uint) (*User, error) {
    var user User
    err := s.db.Preload("Profile").Preload("Posts").First(&user, id).Error
    return &user, err
}

func (s *UserService) GetUserByEmail(email string) (*User, error) {
    var user User
    err := s.db.Where("email = ?", email).First(&user).Error
    return &user, err
}

func (s *UserService) UpdateUser(id uint, updates map[string]interface{}) error {
    return s.db.Model(&User{}).Where("id = ?", id).Updates(updates).Error
}

func (s *UserService) DeleteUser(id uint) error {
    return s.db.Delete(&User{}, id).Error
}

func (s *UserService) ListUsers(page, limit int) ([]User, int64, error) {
    var users []User
    var total int64
    
    offset := (page - 1) * limit
    
    // 获取总数
    s.db.Model(&User{}).Count(&total)
    
    // 获取分页数据
    err := s.db.Offset(offset).Limit(limit).
        Preload("Profile").
        Find(&users).Error
        
    return users, total, err
}

// 文章服务
type PostService struct {
    db *gorm.DB
}

func NewPostService(db *gorm.DB) *PostService {
    return &PostService{db: db}
}

func (s *PostService) CreatePost(post *Post) error {
    return s.db.Create(post).Error
}

func (s *PostService) GetPostByID(id uint) (*Post, error) {
    var post Post
    err := s.db.Preload("User").Preload("Tags").First(&post, id).Error
    return &post, err
}

func (s *PostService) UpdatePostViews(id uint) error {
    return s.db.Model(&Post{}).Where("id = ?", id).
        UpdateColumn("view_count", gorm.Expr("view_count + 1")).Error
}

func (s *PostService) GetPostsByUser(userID uint) ([]Post, error) {
    var posts []Post
    err := s.db.Where("user_id = ?", userID).
        Preload("Tags").
        Order("created_at DESC").
        Find(&posts).Error
    return posts, err
}

func (s *PostService) SearchPosts(keyword string) ([]Post, error) {
    var posts []Post
    err := s.db.Where("title LIKE ? OR content LIKE ?", 
        "%"+keyword+"%", "%"+keyword+"%").
        Preload("User").
        Preload("Tags").
        Order("created_at DESC").
        Find(&posts).Error
    return posts, err
}

// 标签服务
type TagService struct {
    db *gorm.DB
}

func NewTagService(db *gorm.DB) *TagService {
    return &TagService{db: db}
}

func (s *TagService) CreateTag(tag *Tag) error {
    return s.db.Create(tag).Error
}

func (s *TagService) GetOrCreateTag(name string) (*Tag, error) {
    var tag Tag
    err := s.db.FirstOrCreate(&tag, Tag{Name: name}).Error
    return &tag, err
}

func (s *TagService) AddTagsToPost(postID uint, tagNames []string) error {
    // 使用事务
    return s.db.Transaction(func(tx *gorm.DB) error {
        var post Post
        if err := tx.First(&post, postID).Error; err != nil {
            return err
        }
        
        var tags []Tag
        for _, tagName := range tagNames {
            var tag Tag
            if err := tx.FirstOrCreate(&tag, Tag{Name: tagName}).Error; err != nil {
                return err
            }
            tags = append(tags, tag)
        }
        
        return tx.Model(&post).Association("Tags").Replace(tags)
    })