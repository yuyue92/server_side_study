**传统 API 与 RESTful API 的全面对比**

📊 传统 API vs RESTful API 对比
| 对比维度       | 传统 API（RPC风格 / 自定义接口）                                  | RESTful API（资源风格）                      |
| ---------- | ------------------------------------------------------ | -------------------------------------- |
| **核心思想**   | 基于 **操作**（动作/函数调用）                                     | 基于 **资源**（用统一的 URL 表示资源）               |
| **URL 结构** | `/getUserInfo?id=123`<br>`/updateUser?id=123&name=Tom` | `/users/123`（GET）<br>`/users/123`（PUT） |
| **操作行为**   | 用 URL 名表示动词（如 getUser、deleteUser）                      | 用 HTTP 方法表示动词（GET、POST、PUT、DELETE）     |
| **面向对象程度** | 程序员思维（接口即函数）                                           | 面向资源建模（URL 表示实体资源）                     |
| **参数传递**   | 通常通过 Query 参数或 POST body                               | GET 用 Query；POST/PUT 用 JSON body       |
| **标准化程度**  | 无统一规范，随项目需求自定义                                         | 遵循 REST 设计原则，统一风格                      |
| **可读性**    | URL 动作较多，接口数量膨胀                                        | URL 简洁清晰，动作靠 HTTP 方法区分                 |
| **可缓存性**   | 一般不支持缓存                                                | GET 方法天然支持缓存                           |
| **状态管理**   | 可支持有状态（Session）                                        | 通常为无状态（每个请求都独立）                        |
| **适合场景**   | 内部系统、RPC框架（如 gRPC、Thrift）                              | Web 应用、前后端分离、移动端接口                     |
