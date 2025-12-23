package main

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

const (
	dbFile        = "./data/app.db"
	dataDir       = "./data"
	uploadRootDir = "./data/uploads"

	// 限制
	maxRequestBytes = 50 << 20 // 整个请求 50MB
	maxFileBytes    = 15 << 20 // 单文件 15MB
)

type App struct {
	DB *sql.DB
}

type Post struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	CreatedAt time.Time `json:"createdAt"`
	Files     []File    `json:"files,omitempty"`
}

type File struct {
	ID        int64     `json:"id"`
	OrigName  string    `json:"origName"`
	Kind      string    `json:"kind"` // "image" | "text"
	MIME      string    `json:"mime"`
	SizeBytes int64     `json:"sizeBytes"`
	SHA256    string    `json:"sha256"`
	RelPath   string    `json:"relPath"`
	CreatedAt time.Time `json:"createdAt"`
}

func main() {
	_ = os.MkdirAll(uploadRootDir, 0o755)
	_ = os.MkdirAll(dataDir, 0o755)

	db, err := sql.Open("sqlite", dbFile)
	if err != nil {
		panic(err)
	}
	db.SetMaxOpenConns(1)

	app := &App{DB: db}
	if err := app.migrate(context.Background()); err != nil {
		panic(err)
	}

	mux := http.NewServeMux()

	// API
	mux.HandleFunc("/api/posts", app.handlePosts)     // GET list, POST create
	mux.HandleFunc("/api/posts/", app.handlePostByID) // GET one, DELETE

	// Serve file binary by file id
	mux.HandleFunc("/files/", app.handleServeFile) // GET /files/{fileId}?download=1

	// Serve the test html (same dir as main.go)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// 简单路由：根路径也返回测试页
		if r.URL.Path == "/" || r.URL.Path == "/uploadTest.html" {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			http.ServeFile(w, r, "./uploadTest.html")
			return
		}
		http.NotFound(w, r)
	})

	srv := &http.Server{
		Addr:              ":8080",
		Handler:           withCORS(withBasicMiddleware(mux)),
		ReadHeaderTimeout: 5 * time.Second,
	}

	fmt.Println("Server: http://127.0.0.1:8080")
	fmt.Println("Test UI: http://127.0.0.1:8080/uploadTest.html")
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}

func withBasicMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(w, r)
	})
}

// 全局 CORS：让 file:// 或任意域都能调 API（测试用）
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *App) migrate(ctx context.Context) error {
	stmts := []string{
		`PRAGMA foreign_keys = ON;`,
		`CREATE TABLE IF NOT EXISTS posts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL,
			body  TEXT NOT NULL,
			created_at TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS files (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			orig_name TEXT NOT NULL,
			kind TEXT NOT NULL,           -- image|text
			mime TEXT NOT NULL,
			size_bytes INTEGER NOT NULL,
			sha256 TEXT NOT NULL,
			rel_path TEXT NOT NULL,
			created_at TEXT NOT NULL
		);`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_files_sha256 ON files(sha256);`,
		`CREATE TABLE IF NOT EXISTS post_files (
			post_id INTEGER NOT NULL,
			file_id INTEGER NOT NULL,
			ord INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (post_id, file_id),
			FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
			FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
		);`,
	}
	for _, s := range stmts {
		if _, err := a.DB.ExecContext(ctx, s); err != nil {
			return err
		}
	}
	return nil
}

/* ===========================
   Routing
=========================== */

func (a *App) handlePosts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		a.handleCreatePost(w, r)
	case http.MethodGet:
		a.handleListPosts(w, r)
	default:
		writeJSONErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (a *App) handlePostByID(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/api/posts/")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		writeJSONErr(w, http.StatusBadRequest, "invalid id")
		return
	}

	switch r.Method {
	case http.MethodGet:
		a.handleGetPost(w, r, id)
	case http.MethodDelete:
		a.handleDeletePost(w, r, id)
	default:
		writeJSONErr(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

/* ===========================
   Handlers: Create/List/Get/Delete
=========================== */

func (a *App) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)

	// Parse multipart
	if err := r.ParseMultipartForm(maxRequestBytes); err != nil {
		writeJSONErr(w, http.StatusBadRequest, "invalid multipart form: "+err.Error())
		return
	}

	title := strings.TrimSpace(r.FormValue("title"))
	body := strings.TrimSpace(r.FormValue("body"))
	if title == "" || body == "" {
		writeJSONErr(w, http.StatusBadRequest, "title/body required")
		return
	}

	files := r.MultipartForm.File["files"] // 多文件：图片+文本
	now := time.Now().UTC()

	ctx := r.Context()
	tx, err := a.DB.BeginTx(ctx, nil)
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	// insert post
	res, err := tx.ExecContext(ctx,
		`INSERT INTO posts(title, body, created_at) VALUES(?,?,?)`,
		title, body, now.Format(time.RFC3339),
	)
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	postID, _ := res.LastInsertId()

	var saved []File
	ord := 0
	for _, fh := range files {
		ord++
		fm, err := a.saveOneFile(ctx, tx, fh, now)
		if err != nil {
			writeJSONErr(w, http.StatusBadRequest, "file upload failed: "+err.Error())
			return
		}
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO post_files(post_id, file_id, ord) VALUES(?,?,?)`,
			postID, fm.ID, ord,
		); err != nil {
			writeJSONErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		saved = append(saved, fm)
	}

	if err := tx.Commit(); err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, Post{
		ID:        postID,
		Title:     title,
		Body:      body,
		CreatedAt: now,
		Files:     saved,
	})
}

func (a *App) handleListPosts(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page := parseIntDefault(q.Get("page"), 1)
	pageSize := parseIntDefault(q.Get("pageSize"), 10)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	ctx := r.Context()
	rows, err := a.DB.QueryContext(ctx,
		`SELECT id,title,body,created_at FROM posts ORDER BY id DESC LIMIT ? OFFSET ?`,
		pageSize, offset,
	)
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	var items []Post
	for rows.Next() {
		var p Post
		var ca string
		if err := rows.Scan(&p.ID, &p.Title, &p.Body, &ca); err != nil {
			writeJSONErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		p.CreatedAt, _ = time.Parse(time.RFC3339, ca)
		items = append(items, p)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"page":     page,
		"pageSize": pageSize,
		"items":    items,
	})
}

func (a *App) handleGetPost(w http.ResponseWriter, r *http.Request, id int64) {
	ctx := r.Context()

	var p Post
	var ca string
	err := a.DB.QueryRowContext(ctx, `SELECT id,title,body,created_at FROM posts WHERE id=?`, id).
		Scan(&p.ID, &p.Title, &p.Body, &ca)
	if err == sql.ErrNoRows {
		writeJSONErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	p.CreatedAt, _ = time.Parse(time.RFC3339, ca)

	rows, err := a.DB.QueryContext(ctx, `
		SELECT f.id,f.orig_name,f.kind,f.mime,f.size_bytes,f.sha256,f.rel_path,f.created_at
		FROM files f
		JOIN post_files pf ON pf.file_id = f.id
		WHERE pf.post_id = ?
		ORDER BY pf.ord ASC
	`, id)
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer rows.Close()

	for rows.Next() {
		var f File
		var fca string
		if err := rows.Scan(&f.ID, &f.OrigName, &f.Kind, &f.MIME, &f.SizeBytes, &f.SHA256, &f.RelPath, &fca); err != nil {
			writeJSONErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		f.CreatedAt, _ = time.Parse(time.RFC3339, fca)
		p.Files = append(p.Files, f)
	}

	writeJSON(w, http.StatusOK, p)
}

func (a *App) handleDeletePost(w http.ResponseWriter, r *http.Request, id int64) {
	ctx := r.Context()
	tx, err := a.DB.BeginTx(ctx, nil)
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	defer tx.Rollback()

	// 先拿到与 post 关联的文件
	rows, err := tx.QueryContext(ctx, `
		SELECT f.id, f.rel_path
		FROM files f
		JOIN post_files pf ON pf.file_id = f.id
		WHERE pf.post_id = ?
	`, id)
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	type ref struct {
		FileID  int64
		RelPath string
	}
	var refs []ref
	for rows.Next() {
		var rref ref
		if err := rows.Scan(&rref.FileID, &rref.RelPath); err != nil {
			rows.Close()
			writeJSONErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		refs = append(refs, rref)
	}
	rows.Close()

	// 删除 post（post_files 会级联删除）
	res, err := tx.ExecContext(ctx, `DELETE FROM posts WHERE id=?`, id)
	if err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	aff, _ := res.RowsAffected()
	if aff == 0 {
		writeJSONErr(w, http.StatusNotFound, "not found")
		return
	}

	// 对每个文件：如果不再被任何 post 引用，则删除 files 表记录（并在 commit 后删磁盘文件）
	var deleteAfterCommit []string
	for _, rf := range refs {
		var cnt int64
		if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM post_files WHERE file_id=?`, rf.FileID).Scan(&cnt); err != nil {
			writeJSONErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		if cnt == 0 {
			if _, err := tx.ExecContext(ctx, `DELETE FROM files WHERE id=?`, rf.FileID); err != nil {
				writeJSONErr(w, http.StatusInternalServerError, err.Error())
				return
			}
			deleteAfterCommit = append(deleteAfterCommit, rf.RelPath)
		}
	}

	if err := tx.Commit(); err != nil {
		writeJSONErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	// commit 后删除磁盘文件（不会影响 DB 一致性）
	for _, rel := range deleteAfterCommit {
		abs, ok := safeAbsPathFromRel(rel)
		if ok {
			_ = os.Remove(abs)
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"deleted": id})
}

/* ===========================
   Serve file content
=========================== */

func (a *App) handleServeFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSONErr(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	idStr := strings.TrimPrefix(r.URL.Path, "/files/")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || id <= 0 {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	var relPath, mimeType, origName, kind string
	err = a.DB.QueryRowContext(ctx, `SELECT rel_path,mime,orig_name,kind FROM files WHERE id=?`, id).
		Scan(&relPath, &mimeType, &origName, &kind)
	if err == sql.ErrNoRows {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	abs, ok := safeAbsPathFromRel(relPath)
	if !ok {
		http.Error(w, "invalid path", http.StatusForbidden)
		return
	}

	f, err := os.Open(abs)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()

	download := r.URL.Query().Get("download") == "1"

	// content-type
	ct := cleanMime(mimeType)
	if strings.HasPrefix(ct, "text/") && !strings.Contains(ct, "charset") {
		ct = ct + "; charset=utf-8"
	}
	w.Header().Set("Content-Type", ct)

	// disposition
	if download || kind == "text" {
		// 文本默认下载；UI 预览会用 download=0 来 inline fetch
		if r.URL.Query().Get("download") == "0" {
			// inline
		} else {
			w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, escapeQuoted(safeFilename(origName))))
		}
	}

	// cache
	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeContent(w, r, filepath.Base(abs), time.Now(), f)
}

/* ===========================
   Save file logic (image + text)
=========================== */

func (a *App) saveOneFile(ctx context.Context, tx *sql.Tx, fh *multipart.FileHeader, now time.Time) (File, error) {
	if fh.Size > maxFileBytes {
		return File{}, fmt.Errorf("file too large: %d bytes", fh.Size)
	}

	src, err := fh.Open()
	if err != nil {
		return File{}, err
	}
	defer src.Close()

	// sniff head
	head := make([]byte, 512)
	n, _ := io.ReadFull(src, head)
	head = head[:n]

	detected := cleanMime(http.DetectContentType(head))
	kind, finalMime, ok := classifyFile(detected, fh.Filename)
	if !ok {
		return File{}, fmt.Errorf("unsupported file type: detected=%s name=%s", detected, safeFilename(fh.Filename))
	}

	// temp file
	tmpDir := filepath.Join(uploadRootDir, "tmp")
	if err := os.MkdirAll(tmpDir, 0o755); err != nil {
		return File{}, err
	}
	tmp, err := os.CreateTemp(tmpDir, "upload-*")
	if err != nil {
		return File{}, err
	}
	defer func() {
		tmp.Close()
		_ = os.Remove(tmp.Name())
	}()

	// hash + write
	h := sha256.New()
	if _, err := tmp.Write(head); err != nil {
		return File{}, err
	}
	if _, err := h.Write(head); err != nil {
		return File{}, err
	}

	written, err := io.Copy(io.MultiWriter(tmp, h), io.LimitReader(src, maxFileBytes+1))
	if err != nil {
		return File{}, err
	}
	size := int64(len(head)) + written
	if size > maxFileBytes {
		return File{}, fmt.Errorf("file too large after read: %d bytes", size)
	}
	sum := hex.EncodeToString(h.Sum(nil))

	// validate image data
	if kind == "image" {
		if _, err := tmp.Seek(0, io.SeekStart); err != nil {
			return File{}, err
		}
		if _, _, err := image.DecodeConfig(tmp); err != nil {
			return File{}, fmt.Errorf("invalid image data: %v", err)
		}
	}

	// dedup by sha256
	var existing File
	var ca string
	err = tx.QueryRowContext(ctx, `
		SELECT id,orig_name,kind,mime,size_bytes,sha256,rel_path,created_at
		FROM files WHERE sha256=?
	`, sum).Scan(&existing.ID, &existing.OrigName, &existing.Kind, &existing.MIME, &existing.SizeBytes, &existing.SHA256, &existing.RelPath, &ca)
	if err == nil {
		existing.CreatedAt, _ = time.Parse(time.RFC3339, ca)
		return existing, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return File{}, err
	}

	// final path
	ext := guessExt(finalMime, fh.Filename)
	relDir := filepath.Join("uploads", now.Format("2006"), now.Format("01"), now.Format("02"))
	finalDir := filepath.Join(dataDir, relDir)
	if err := os.MkdirAll(finalDir, 0o755); err != nil {
		return File{}, err
	}

	finalName := sum + ext
	finalAbs := filepath.Join(finalDir, finalName)
	finalRel := filepath.ToSlash(filepath.Join(relDir, finalName))

	// copy tmp -> final
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		return File{}, err
	}
	out, err := os.Create(finalAbs)
	if err != nil {
		return File{}, err
	}
	if _, err := io.Copy(out, tmp); err != nil {
		out.Close()
		_ = os.Remove(finalAbs)
		return File{}, err
	}
	if err := out.Close(); err != nil {
		_ = os.Remove(finalAbs)
		return File{}, err
	}

	// insert meta
	res, err := tx.ExecContext(ctx, `
		INSERT INTO files(orig_name,kind,mime,size_bytes,sha256,rel_path,created_at)
		VALUES(?,?,?,?,?,?,?)
	`, safeFilename(fh.Filename), kind, finalMime, size, sum, finalRel, now.Format(time.RFC3339))
	if err != nil {
		_ = os.Remove(finalAbs)
		return File{}, err
	}
	fileID, _ := res.LastInsertId()

	return File{
		ID:        fileID,
		OrigName:  safeFilename(fh.Filename),
		Kind:      kind,
		MIME:      finalMime,
		SizeBytes: size,
		SHA256:    sum,
		RelPath:   finalRel,
		CreatedAt: now,
	}, nil
}

/* ===========================
   Type classify helpers
=========================== */

func cleanMime(m string) string {
	m = strings.TrimSpace(m)
	if i := strings.IndexByte(m, ';'); i >= 0 {
		m = strings.TrimSpace(m[:i])
	}
	return strings.ToLower(m)
}

func classifyFile(detectedMime string, filename string) (kind string, finalMime string, ok bool) {
	ext := strings.ToLower(filepath.Ext(filename))

	// Images
	switch detectedMime {
	case "image/jpeg", "image/png", "image/gif":
		return "image", detectedMime, true
	}

	// Text: http.DetectContentType 对文本经常是 text/plain 或 application/octet-stream
	if strings.HasPrefix(detectedMime, "text/") {
		return "text", detectedMime, true
	}

	// 对于被 sniff 成 octet-stream 的文本文件，用扩展名兜底
	if detectedMime == "application/octet-stream" {
		switch ext {
		case ".txt":
			return "text", "text/plain", true
		case ".md":
			return "text", "text/markdown", true
		case ".csv":
			return "text", "text/csv", true
		case ".json":
			return "text", "application/json", true
		case ".xml":
			return "text", "application/xml", true
		case ".yaml", ".yml":
			return "text", "text/yaml", true
		}
	}

	// 额外允许：json/xml 即使 sniff 不是 text/*
	if detectedMime == "application/json" || detectedMime == "application/xml" {
		return "text", detectedMime, true
	}

	return "", "", false
}

func guessExt(mimeType, origName string) string {
	exts, _ := mime.ExtensionsByType(mimeType)
	if len(exts) > 0 {
		// 某些平台可能返回 .jpe 之类，保持第一个即可
		return exts[0]
	}
	ext := strings.ToLower(filepath.Ext(origName))
	// 兜底：仅允许较安全的扩展
	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml":
		return ext
	default:
		return ""
	}
}

/* ===========================
   Path safety + misc
=========================== */

func safeAbsPathFromRel(rel string) (abs string, ok bool) {
	// rel 应该形如 uploads/2025/12/23/xxx.ext
	rel = filepath.FromSlash(rel)
	clean := filepath.Clean(rel)
	abs = filepath.Clean(filepath.Join(dataDir, clean))

	root := filepath.Clean(uploadRootDir)
	// abs 必须在 uploadRootDir 内（防 ../ 穿越）
	if abs == root {
		return abs, true
	}
	if strings.HasPrefix(abs, root+string(os.PathSeparator)) {
		return abs, true
	}
	return "", false
}

func safeFilename(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, "\x00", "")
	if name == "" || name == "." || name == string(filepath.Separator) {
		return "file"
	}
	return name
}

func escapeQuoted(s string) string {
	// filename="...": 只做最基础转义
	return strings.ReplaceAll(s, `"`, `_`)
}

func parseIntDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}

/* ===========================
   JSON helpers
=========================== */

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeJSONErr(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]any{"error": msg})
}
