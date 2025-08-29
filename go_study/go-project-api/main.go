package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "modernc.org/sqlite"
)

const (
	defaultDBPath = "pm.db"
)

func main() {
	// --- DB ---
	dbPath := getenv("DB_PATH", defaultDBPath)
	db, err := sql.Open("sqlite", dbPath)
	must(err)
	defer db.Close()
	must(initSchema(db))
	must(enableFK(db))

	// --- Router ---
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	// CORS：前端可直接跨域调用
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"Content-Length"},
		MaxAge:           600, // seconds
		AllowCredentials: false,
	}))

	// --- Routes ---
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "ts": time.Now().UTC()})
	})

	// Projects
	r.Route("/projects", func(r chi.Router) {
		r.Get("/", listProjects(db))
		r.Post("/", createProject(db))

		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", getProject(db))
			r.Put("/", updateProject(db))
			r.Patch("/status", patchProjectStatus(db))
			r.Delete("/", deleteProject(db))

			r.Get("/tasks", listTasks(db))   // 列出该项目下任务
			r.Post("/tasks", createTask(db)) // 在该项目下创建任务（sqlproject_id 自动取 URL:id）
		})
	})

	// Tasks 顶级路由（支持按条件筛选）
	r.Route("/tasks", func(r chi.Router) {
		r.Get("/", listTasks(db))
		r.Post("/", createTask(db)) // 也可在 body 里指定 sqlproject_id

		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", getTask(db))
			r.Put("/", updateTask(db))
			r.Patch("/status", patchTaskStatus(db))
			r.Delete("/", deleteTask(db))
		})
	})

	addr := getenv("ADDR", ":8080")
	log.Printf("Project API listening on %s (db=%s)\n", addr, dbPath)
	must(http.ListenAndServe(addr, r))
}

// ====== Models ======

type Project struct {
	SQLID            int64    `json:"sqlid"`
	Name             string   `json:"name"`
	Description      *string  `json:"description,omitempty"`
	ProjectManagerID *int64   `json:"project_manager_id,omitempty"`
	ClientID         *int64   `json:"client_id,omitempty"`
	Budget           *float64 `json:"budget,omitempty"`
	StartDate        *string  `json:"start_date,omitempty"` // YYYY-MM-DD
	Deadline         *string  `json:"deadline,omitempty"`   // YYYY-MM-DD
	Status           string   `json:"status"`               // e.g. planned/active/paused/completed/canceled
	CreatedAt        string   `json:"created_at"`
}

type Task struct {
	SQLID        int64    `json:"sqlid"`
	SQLProjectID int64    `json:"sqlproject_id"`
	TaskName     string   `json:"task_name"`
	Description  *string  `json:"description,omitempty"`
	AssigneeID   *int64   `json:"assignee_id,omitempty"`
	Priority     *string  `json:"priority,omitempty"` // low/medium/high/urgent
	EstimatedHrs *float64 `json:"estimated_hours,omitempty"`
	ActualHrs    *float64 `json:"actual_hours,omitempty"`
	Status       string   `json:"status"`             // todo/doing/done/blocked
	DueDate      *string  `json:"due_date,omitempty"` // YYYY-MM-DD
	CreatedAt    string   `json:"created_at"`
}

// ====== DB & Schema ======

func enableFK(db *sql.DB) error {
	_, err := db.Exec(`PRAGMA foreign_keys = ON;`)
	return err
}

func initSchema(db *sql.DB) error {
	schema := `
CREATE TABLE IF NOT EXISTS projects (
  sqlid               INTEGER PRIMARY KEY AUTOINCREMENT,
  name                TEXT NOT NULL,
  description         TEXT,
  project_manager_id  INTEGER,
  client_id           INTEGER,
  budget              REAL,
  start_date          TEXT, -- YYYY-MM-DD
  deadline            TEXT, -- YYYY-MM-DD
  status              TEXT NOT NULL DEFAULT 'planned',
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(project_manager_id);

CREATE TABLE IF NOT EXISTS tasks (
  sqlid           INTEGER PRIMARY KEY AUTOINCREMENT,
  sqlproject_id   INTEGER NOT NULL,
  task_name       TEXT NOT NULL,
  description     TEXT,
  assignee_id     INTEGER,
  priority        TEXT,
  estimated_hours REAL,
  actual_hours    REAL,
  status          TEXT NOT NULL DEFAULT 'todo',
  due_date        TEXT, -- YYYY-MM-DD
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (sqlproject_id) REFERENCES projects(sqlid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(sqlproject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
`
	_, err := db.Exec(schema)
	return err
}

// ====== Helpers ======

func must(err error) {
	if err != nil {
		log.Fatal(err)
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func parseID(r *http.Request, param string) (int64, error) {
	idStr := chi.URLParam(r, param)
	if idStr == "" {
		return 0, errors.New("missing id")
	}
	return strconv.ParseInt(idStr, 10, 64)
}

func nullStrPtr(s *string) any {
	if s == nil {
		return nil
	}
	if strings.TrimSpace(*s) == "" {
		return nil
	}
	return *s
}

func nullF64Ptr(p *float64) any {
	if p == nil {
		return nil
	}
	return *p
}

func nullI64Ptr(p *int64) any {
	if p == nil {
		return nil
	}
	return *p
}

// ====== Projects Handlers ======

func createProject(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in Project
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}
		if strings.TrimSpace(in.Name) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
			return
		}
		if in.Status == "" {
			in.Status = "planned"
		}

		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		q := `
INSERT INTO projects (name, description, project_manager_id, client_id, budget, start_date, deadline, status)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`
		res, err := db.ExecContext(ctx, q,
			in.Name,
			nullStrPtr(in.Description),
			nullI64Ptr(in.ProjectManagerID),
			nullI64Ptr(in.ClientID),
			nullF64Ptr(in.Budget),
			nullStrPtr(in.StartDate),
			nullStrPtr(in.Deadline),
			in.Status,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		id, _ := res.LastInsertId()
		out, err := getProjectByID(r.Context(), db, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, out)
	}
}

func listProjects(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 支持筛选与分页
		qp := r.URL.Query()
		status := strings.TrimSpace(qp.Get("status"))
		manager := strings.TrimSpace(qp.Get("project_manager_id"))
		client := strings.TrimSpace(qp.Get("client_id"))
		nameLike := strings.TrimSpace(qp.Get("q"))
		limit := parseIntDefault(qp.Get("limit"), 20, 1, 200)
		offset := parseIntDefault(qp.Get("offset"), 0, 0, 1_000_000)
		sort := qp.Get("sort") // e.g. "created_at desc" / "deadline asc"

		where := []string{}
		args := []any{}
		if status != "" {
			where = append(where, "status = ?")
			args = append(args, status)
		}
		if manager != "" {
			where = append(where, "project_manager_id = ?")
			args = append(args, manager)
		}
		if client != "" {
			where = append(where, "client_id = ?")
			args = append(args, client)
		}
		if nameLike != "" {
			where = append(where, "name LIKE ?")
			args = append(args, "%"+nameLike+"%")
		}

		sb := strings.Builder{}
		sb.WriteString("SELECT sqlid, name, description, project_manager_id, client_id, budget, start_date, deadline, status, created_at FROM projects ")
		if len(where) > 0 {
			sb.WriteString("WHERE " + strings.Join(where, " AND ") + " ")
		}
		if sort != "" {
			// 极简白名单，防止 SQL 注入
			if !validSort(sort) {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid sort"})
				return
			}
			sb.WriteString("ORDER BY " + sort + " ")
		} else {
			sb.WriteString("ORDER BY created_at DESC ")
		}
		sb.WriteString("LIMIT ? OFFSET ?")
		args = append(args, limit, offset)

		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		rows, err := db.QueryContext(ctx, sb.String(), args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		defer rows.Close()

		var out []Project
		for rows.Next() {
			var p Project
			scanProject(rows, &p)
			out = append(out, p)
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"items":  out,
			"limit":  limit,
			"offset": offset,
		})
	}
}

func getProject(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseID(r, "id")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
			return
		}
		p, err := getProjectByID(r.Context(), db, id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			} else {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			}
			return
		}
		writeJSON(w, http.StatusOK, p)
	}
}

func updateProject(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseID(r, "id")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
			return
		}
		var in Project
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}
		if strings.TrimSpace(in.Name) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
			return
		}
		if in.Status == "" {
			in.Status = "planned"
		}
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		q := `
UPDATE projects
SET name=?, description=?, project_manager_id=?, client_id=?, budget=?, start_date=?, deadline=?, status=?
WHERE sqlid=?
`
		res, err := db.ExecContext(ctx, q,
			in.Name,
			nullStrPtr(in.Description),
			nullI64Ptr(in.ProjectManagerID),
			nullI64Ptr(in.ClientID),
			nullF64Ptr(in.Budget),
			nullStrPtr(in.StartDate),
			nullStrPtr(in.Deadline),
			in.Status,
			id,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		aff, _ := res.RowsAffected()
		if aff == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		out, err := getProjectByID(r.Context(), db, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, out)
	}
}

func patchProjectStatus(db *sql.DB) http.HandlerFunc {
	type payload struct {
		Status string `json:"status"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseID(r, "id")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
			return
		}
		var in payload
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Status) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "status is required"})
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		res, err := db.ExecContext(ctx, `UPDATE projects SET status=? WHERE sqlid=?`, in.Status, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		out, _ := getProjectByID(r.Context(), db, id)
		writeJSON(w, http.StatusOK, out)
	}
}

func deleteProject(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseID(r, "id")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		res, err := db.ExecContext(ctx, `DELETE FROM projects WHERE sqlid=?`, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		writeJSON(w, http.StatusNoContent, nil)
	}
}

func getProjectByID(ctx context.Context, db *sql.DB, id int64) (Project, error) {
	row := db.QueryRowContext(ctx, `
SELECT sqlid, name, description, project_manager_id, client_id, budget, start_date, deadline, status, created_at
FROM projects WHERE sqlid=?`, id)
	var p Project
	err := scanProject(row, &p)
	return p, err
}

func scanProject(scanner interface{ Scan(dest ...any) error }, p *Project) error {
	var (
		desc   sql.NullString
		start  sql.NullString
		dead   sql.NullString
		pm     sql.NullInt64
		cl     sql.NullInt64
		budget sql.NullFloat64
	)
	err := scanner.Scan(
		&p.SQLID, &p.Name, &desc, &pm, &cl, &budget, &start, &dead, &p.Status, &p.CreatedAt,
	)
	if err != nil {
		return err
	}
	if desc.Valid {
		p.Description = &desc.String
	}
	if start.Valid {
		p.StartDate = &start.String
	}
	if dead.Valid {
		p.Deadline = &dead.String
	}
	if pm.Valid {
		p.ProjectManagerID = &pm.Int64
	}
	if cl.Valid {
		p.ClientID = &cl.Int64
	}
	if budget.Valid {
		p.Budget = &budget.Float64
	}
	return nil
}

// ====== Tasks Handlers ======

func createTask(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var in Task
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}
		// 如果在 /projects/{id}/tasks 下调用，优先用 URL 的项目 id
		if pid, err := parseID(r, "id"); err == nil && pid > 0 {
			in.SQLProjectID = pid
		}
		if in.SQLProjectID == 0 || strings.TrimSpace(in.TaskName) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "sqlproject_id and task_name are required"})
			return
		}
		if in.Status == "" {
			in.Status = "todo"
		}

		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		q := `
INSERT INTO tasks (sqlproject_id, task_name, description, assignee_id, priority, estimated_hours, actual_hours, status, due_date)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`
		res, err := db.ExecContext(ctx, q,
			in.SQLProjectID,
			in.TaskName,
			nullStrPtr(in.Description),
			nullI64Ptr(in.AssigneeID),
			nullStrPtr(in.Priority),
			nullF64Ptr(in.EstimatedHrs),
			nullF64Ptr(in.ActualHrs),
			in.Status,
			nullStrPtr(in.DueDate),
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		id, _ := res.LastInsertId()
		out, err := getTaskByID(r.Context(), db, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusCreated, out)
	}
}

func listTasks(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		qp := r.URL.Query()
		pidFromURL, _ := parseID(r, "id")
		projectID := qp.Get("sqlproject_id")
		if pidFromURL > 0 {
			projectID = strconv.FormatInt(pidFromURL, 10)
		}
		status := qp.Get("status")
		assignee := qp.Get("assignee_id")
		priority := qp.Get("priority")
		dueBefore := qp.Get("due_before") // YYYY-MM-DD
		dueAfter := qp.Get("due_after")
		qLike := strings.TrimSpace(qp.Get("q")) // task_name LIKE
		limit := parseIntDefault(qp.Get("limit"), 20, 1, 200)
		offset := parseIntDefault(qp.Get("offset"), 0, 0, 1_000_000)
		sort := qp.Get("sort") // e.g. "due_date asc", "created_at desc"

		where := []string{}
		args := []any{}
		if projectID != "" {
			where = append(where, "sqlproject_id = ?")
			args = append(args, projectID)
		}
		if status != "" {
			where = append(where, "status = ?")
			args = append(args, status)
		}
		if assignee != "" {
			where = append(where, "assignee_id = ?")
			args = append(args, assignee)
		}
		if priority != "" {
			where = append(where, "priority = ?")
			args = append(args, priority)
		}
		if dueBefore != "" {
			where = append(where, "due_date <= ?")
			args = append(args, dueBefore)
		}
		if dueAfter != "" {
			where = append(where, "due_date >= ?")
			args = append(args, dueAfter)
		}
		if qLike != "" {
			where = append(where, "task_name LIKE ?")
			args = append(args, "%"+qLike+"%")
		}

		sb := strings.Builder{}
		sb.WriteString(`SELECT sqlid, sqlproject_id, task_name, description, assignee_id, priority, estimated_hours, actual_hours, status, due_date, created_at FROM tasks `)
		if len(where) > 0 {
			sb.WriteString("WHERE " + strings.Join(where, " AND ") + " ")
		}
		if sort != "" {
			if !validTaskSort(sort) {
				writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid sort"})
				return
			}
			sb.WriteString("ORDER BY " + sort + " ")
		} else {
			sb.WriteString("ORDER BY created_at DESC ")
		}
		sb.WriteString("LIMIT ? OFFSET ?")
		args = append(args, limit, offset)

		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		rows, err := db.QueryContext(ctx, sb.String(), args...)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		defer rows.Close()

		var out []Task
		for rows.Next() {
			var t Task
			scanTask(rows, &t)
			out = append(out, t)
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"items":  out,
			"limit":  limit,
			"offset": offset,
		})
	}
}

func getTask(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseID(r, "id")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
			return
		}
		t, err := getTaskByID(r.Context(), db, id)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			} else {
				writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			}
			return
		}
		writeJSON(w, http.StatusOK, t)
	}
}

func updateTask(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseID(r, "id")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
			return
		}
		var in Task
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
			return
		}
		if in.SQLProjectID == 0 || strings.TrimSpace(in.TaskName) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "sqlproject_id and task_name are required"})
			return
		}
		if in.Status == "" {
			in.Status = "todo"
		}
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		q := `
UPDATE tasks
SET sqlproject_id=?, task_name=?, description=?, assignee_id=?, priority=?, estimated_hours=?, actual_hours=?, status=?, due_date=?
WHERE sqlid=?
`
		res, err := db.ExecContext(ctx, q,
			in.SQLProjectID,
			in.TaskName,
			nullStrPtr(in.Description),
			nullI64Ptr(in.AssigneeID),
			nullStrPtr(in.Priority),
			nullF64Ptr(in.EstimatedHrs),
			nullF64Ptr(in.ActualHrs),
			in.Status,
			nullStrPtr(in.DueDate),
			id,
		)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		out, _ := getTaskByID(r.Context(), db, id)
		writeJSON(w, http.StatusOK, out)
	}
}

func patchTaskStatus(db *sql.DB) http.HandlerFunc {
	type payload struct {
		Status string `json:"status"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseID(r, "id")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
			return
		}
		var in payload
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil || strings.TrimSpace(in.Status) == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "status is required"})
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		res, err := db.ExecContext(ctx, `UPDATE tasks SET status=? WHERE sqlid=?`, in.Status, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		out, _ := getTaskByID(r.Context(), db, id)
		writeJSON(w, http.StatusOK, out)
	}
}

func deleteTask(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseID(r, "id")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		res, err := db.ExecContext(ctx, `DELETE FROM tasks WHERE sqlid=?`, id)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		writeJSON(w, http.StatusNoContent, nil)
	}
}

func getTaskByID(ctx context.Context, db *sql.DB, id int64) (Task, error) {
	row := db.QueryRowContext(ctx, `
SELECT sqlid, sqlproject_id, task_name, description, assignee_id, priority, estimated_hours, actual_hours, status, due_date, created_at
FROM tasks WHERE sqlid=?`, id)
	var t Task
	err := scanTask(row, &t)
	return t, err
}

func scanTask(scanner interface{ Scan(dest ...any) error }, t *Task) error {
	var (
		desc     sql.NullString
		assignee sql.NullInt64
		priority sql.NullString
		est      sql.NullFloat64
		act      sql.NullFloat64
		due      sql.NullString
	)
	err := scanner.Scan(
		&t.SQLID, &t.SQLProjectID, &t.TaskName, &desc, &assignee, &priority, &est, &act, &t.Status, &due, &t.CreatedAt,
	)
	if err != nil {
		return err
	}
	if desc.Valid {
		t.Description = &desc.String
	}
	if assignee.Valid {
		t.AssigneeID = &assignee.Int64
	}
	if priority.Valid {
		t.Priority = &priority.String
	}
	if est.Valid {
		t.EstimatedHrs = &est.Float64
	}
	if act.Valid {
		t.ActualHrs = &act.Float64
	}
	if due.Valid {
		t.DueDate = &due.String
	}
	return nil
}

// ====== utils ======

func parseIntDefault(s string, def, min, max int) int {
	if s == "" {
		return def
	}
	v, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

func validSort(s string) bool {
	s = strings.ToLower(strings.TrimSpace(s))
	// 允许字段
	fields := map[string]bool{
		"created_at": true, "deadline": true, "start_date": true, "name": true, "status": true,
	}
	parts := strings.Fields(s)
	if len(parts) == 1 {
		_, ok := fields[parts[0]]
		return ok
	}
	if len(parts) == 2 {
		_, ok := fields[parts[0]]
		if !ok {
			return false
		}
		return parts[1] == "asc" || parts[1] == "desc"
	}
	return false
}

func validTaskSort(s string) bool {
	s = strings.ToLower(strings.TrimSpace(s))
	fields := map[string]bool{
		"created_at": true, "due_date": true, "status": true, "priority": true, "task_name": true,
	}
	parts := strings.Fields(s)
	if len(parts) == 1 {
		_, ok := fields[parts[0]]
		return ok
	}
	if len(parts) == 2 {
		_, ok := fields[parts[0]]
		if !ok {
			return false
		}
		return parts[1] == "asc" || parts[1] == "desc"
	}
	return false
}
