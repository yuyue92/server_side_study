**API 速览**
- Projects
- POST /projects
- GET /projects?status=&project_manager_id=&client_id=&q=&limit=&offset=&sort=created_at desc
- GET /projects/{id}
- PUT /projects/{id}
- PATCH /projects/{id}/status { "status": "active" }
- DELETE /projects/{id}
- GET /projects/{id}/tasks（该项目的所有任务）
- POST /projects/{id}/tasks（在该项目下创建任务）

Tasks
- POST /tasks（或 POST /projects/{id}/tasks）
- GET /tasks?sqlproject_id=&status=&assignee_id=&priority=&due_before=&due_after=&q=&limit=&offset=&sort=due_date asc
- GET /tasks/{id}
- PUT /tasks/{id}
- PATCH /tasks/{id}/status { "status": "done" }
- DELETE /tasks/{id}
