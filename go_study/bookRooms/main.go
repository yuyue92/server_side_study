package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	_ "modernc.org/sqlite"
	"os/exec"
    "path/filepath"
    "runtime"
)

// ------------------------------------------------------------
// Models & DTOs
// ------------------------------------------------------------

type Room struct {
	ID        string `json:"id"`
	RoomNo    string `json:"room_no"`
	Capacity  int    `json:"capacity"`
	CreatedAt string `json:"created_at"`
}

type Booking struct {
	ID        string `json:"id"`
	RoomID    string `json:"room_id"`
	GuestID   string `json:"guest_id"`
	StartsAt  string `json:"starts_at"` // RFC3339
	EndsAt    string `json:"ends_at"`   // RFC3339
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

// internal representation for time storage (unix seconds)
type bookingRow struct {
	ID       string
	RoomID   string
	GuestID  string
	StartSec int64
	EndSec   int64
	Status   string
	Created  string
}

// Allowed statuses
var allowedStatus = map[string]bool{
	"PENDING":   true,
	"CONFIRMED": true,
	"CANCELLED": true,
	"DONE":      true,
}

// ------------------------------------------------------------
// App bootstrap
// ------------------------------------------------------------

type App struct {
	db *sql.DB
}

// 将路径或 URL 规范化为可打开的目标（本地文件 -> file://）
func toOpenTarget(s string) string {
    if strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://") || strings.HasPrefix(s, "file://") {
        return s
    }
    if abs, err := filepath.Abs(s); err == nil {
        return "file://" + abs
    }
    return s
}

// 跨平台打开默认浏览器
func openBrowser(target string) error {
    switch runtime.GOOS {
    case "windows":
        return exec.Command("rundll32", "url.dll,FileProtocolHandler", target).Start()
    case "darwin":
        return exec.Command("open", target).Start()
    default: // linux, etc.
        return exec.Command("xdg-open", target).Start()
    }
}

func main() {
	port := getenv("PORT", "8080")
	dsn := getenv("DB_PATH", "app.db")

	// modernc.org/sqlite driver name is "sqlite"
	db, err := sql.Open("sqlite", fmt.Sprintf("file:%s?_foreign_keys=on&_busy_timeout=5000", dsn))
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()

	if _, err := db.Exec(`PRAGMA journal_mode=WAL;`); err != nil {
		log.Printf("warn: set WAL failed: %v", err)
	}
	if _, err := db.Exec(`PRAGMA foreign_keys=ON;`); err != nil {
		log.Printf("warn: enable FKs failed: %v", err)
	}

	if err := migrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	app := &App{db: db}

	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.RequestID)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware())

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, http.StatusOK, map[string]any{"ok": true}) })

	// Rooms
	r.Route("/rooms", func(r chi.Router) {
		r.Post("/", app.createRoom)
		r.Get("/", app.listRooms)
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", app.getRoom)
			r.Patch("/", app.updateRoom)
			r.Delete("/", app.deleteRoom)
			// nested: list bookings for a room
			r.Get("/bookings", app.listRoomBookings)
		})
	})

	// Bookings
	r.Route("/bookings", func(r chi.Router) {
		r.Post("/", app.createBooking)
		r.Get("/", app.listBookings)
		r.Route("/{id}", func(r chi.Router) {
			r.Get("/", app.getBooking)
			r.Patch("/", app.updateBooking)
			r.Delete("/", app.deleteBooking)
		})
	})

	log.Printf("listening on :%s", port)
	
	time.Sleep(3 * time.Second)

    // 1) 优先 FRONTEND_URL（例如 http://localhost:5173）
    target := os.Getenv("FRONTEND_URL")

    // 2) 若未设置，且当前目录存在 index.html，则打开本地文件
    if target == "" {
        idx := getenv("FRONTEND_INDEX", "index.html")
        if _, err := os.Stat(idx); err == nil {
            target = toOpenTarget(idx)
        }
    }

    // 3) 再不行，兜底到 Vite 常用端口
    if target == "" {
        target = "http://localhost:5173"
    }

    if err := openBrowser(target); err != nil {
        log.Printf("auto-open failed: %v (target=%s)", err, target)
    } else {
        log.Printf("opened browser: %s", target)
    }

	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

// ------------------------------------------------------------
// Migrations (SQLite schema approximating the given Postgres schema)
// ------------------------------------------------------------

func migrate(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS rooms (
			id TEXT PRIMARY KEY,
			room_no TEXT UNIQUE NOT NULL,
			capacity INTEGER NOT NULL CHECK (capacity > 0),
			created_at TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS bookings (
			id TEXT PRIMARY KEY,
			room_id TEXT NOT NULL,
			guest_id TEXT NOT NULL,
			starts_at INTEGER NOT NULL,
			ends_at INTEGER NOT NULL,
			status TEXT NOT NULL CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','DONE')),
			created_at TEXT NOT NULL,
			FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
			CHECK (ends_at > starts_at)
		);`,
		`CREATE INDEX IF NOT EXISTS idx_rooms_room_no ON rooms(room_no);`,
		`CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON bookings(room_id, starts_at, ends_at);`,
		`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);`,
		// Partial index for active bookings to speed up overlap checks
		`CREATE INDEX IF NOT EXISTS idx_bookings_active_range ON bookings(room_id, starts_at, ends_at) WHERE status IN ('PENDING','CONFIRMED');`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			return fmt.Errorf("migrate exec: %w", err)
		}
	}
	return nil
}

// ------------------------------------------------------------
// Rooms handlers
// ------------------------------------------------------------

type createRoomReq struct {
	RoomNo   string `json:"room_no"`
	Capacity int    `json:"capacity"`
}

func (a *App) createRoom(w http.ResponseWriter, r *http.Request) {
	var req createRoomReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, "invalid JSON body")
		return
	}
	if strings.TrimSpace(req.RoomNo) == "" || req.Capacity <= 0 {
		badRequest(w, "room_no and positive capacity are required")
		return
	}

	id := uuid.New().String()
	now := time.Now().UTC().Format(time.RFC3339)

	_, err := a.db.Exec(`INSERT INTO rooms(id, room_no, capacity, created_at) VALUES(?,?,?,?)`, id, req.RoomNo, req.Capacity, now)
	if err != nil {
		if isUniqueViolation(err) {
			conflict(w, "room_no already exists")
			return
		}
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, Room{ID: id, RoomNo: req.RoomNo, Capacity: req.Capacity, CreatedAt: now})
}

func (a *App) listRooms(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(`SELECT id, room_no, capacity, created_at FROM rooms ORDER BY created_at DESC`)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()
	// var list []Room
	list := []Room{} // 关键：用空切片而不是 nil
	for rows.Next() {
		var rm Room
		if err := rows.Scan(&rm.ID, &rm.RoomNo, &rm.Capacity, &rm.CreatedAt); err != nil {
			serverError(w, err)
			return
		}
		list = append(list, rm)
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *App) getRoom(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var rm Room
	err := a.db.QueryRow(`SELECT id, room_no, capacity, created_at FROM rooms WHERE id = ?`, id).Scan(&rm.ID, &rm.RoomNo, &rm.Capacity, &rm.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, rm)
}

type updateRoomReq struct {
	RoomNo   *string `json:"room_no"`
	Capacity *int    `json:"capacity"`
}

func (a *App) updateRoom(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req updateRoomReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, "invalid JSON body")
		return
	}

	// Build dynamic update
	sets := []string{}
	args := []any{}
	if req.RoomNo != nil {
		if strings.TrimSpace(*req.RoomNo) == "" {
			badRequest(w, "room_no cannot be empty")
			return
		}
		sets = append(sets, "room_no = ?")
		args = append(args, *req.RoomNo)
	}
	if req.Capacity != nil {
		if *req.Capacity <= 0 {
			badRequest(w, "capacity must be > 0")
			return
		}
		sets = append(sets, "capacity = ?")
		args = append(args, *req.Capacity)
	}
	if len(sets) == 0 {
		badRequest(w, "no fields to update")
		return
	}
	args = append(args, id)

	res, err := a.db.Exec("UPDATE rooms SET "+strings.Join(sets, ", ")+" WHERE id = ?", args...)
	if err != nil {
		if isUniqueViolation(err) {
			conflict(w, "room_no already exists")
			return
		}
		serverError(w, err)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		notFound(w)
		return
	}
	a.getRoom(w, r)
}

func (a *App) deleteRoom(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	res, err := a.db.Exec(`DELETE FROM rooms WHERE id = ?`, id)
	if err != nil {
		serverError(w, err)
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		notFound(w)
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}

func (a *App) listRoomBookings(w http.ResponseWriter, r *http.Request) {
	roomID := chi.URLParam(r, "id")
	q := r.URL.Query()
	fromStr := q.Get("from")
	toStr := q.Get("to")

	where := []string{"room_id = ?"}
	args := []any{roomID}
	if fromStr != "" {
		if fromT, err := parseRFC3339(fromStr); err == nil {
			where = append(where, "ends_at > ?")
			args = append(args, fromT.Unix())
		}
	}
	if toStr != "" {
		if toT, err := parseRFC3339(toStr); err == nil {
			where = append(where, "starts_at < ?")
			args = append(args, toT.Unix())
		}
	}

	rows, err := a.db.Query(`SELECT id, room_id, guest_id, starts_at, ends_at, status, created_at
		FROM bookings WHERE `+strings.Join(where, " AND ")+` ORDER BY starts_at`, args...)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()

	// var list []Booking
	list := []Booking{} // 关键
	for rows.Next() {
		var br bookingRow
		if err := rows.Scan(&br.ID, &br.RoomID, &br.GuestID, &br.StartSec, &br.EndSec, &br.Status, &br.Created); err != nil {
			serverError(w, err)
			return
		}
		list = append(list, toBookingDTO(br))
	}
	writeJSON(w, http.StatusOK, list)
}

// ------------------------------------------------------------
// Bookings handlers
// ------------------------------------------------------------

type createBookingReq struct {
	RoomID   string  `json:"room_id"`
	GuestID  string  `json:"guest_id"`
	StartsAt string  `json:"starts_at"`
	EndsAt   string  `json:"ends_at"`
	Status   *string `json:"status"` // optional, default PENDING
}

func (a *App) createBooking(w http.ResponseWriter, r *http.Request) {
	var req createBookingReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, "invalid JSON body")
		return
	}
	if req.RoomID == "" || req.GuestID == "" || req.StartsAt == "" || req.EndsAt == "" {
		badRequest(w, "room_id, guest_id, starts_at, ends_at are required")
		return
	}
	startT, err := parseRFC3339(req.StartsAt)
	if err != nil {
		badRequest(w, "starts_at must be RFC3339")
		return
	}
	endT, err := parseRFC3339(req.EndsAt)
	if err != nil {
		badRequest(w, "ends_at must be RFC3339")
		return
	}
	if !endT.After(startT) {
		badRequest(w, "ends_at must be after starts_at")
		return
	}
	status := "PENDING"
	if req.Status != nil {
		status = strings.ToUpper(strings.TrimSpace(*req.Status))
		if !allowedStatus[status] {
			badRequest(w, "invalid status")
			return
		}
	}

	id := uuid.New().String()
	now := time.Now().UTC().Format(time.RFC3339)

	ctx := r.Context()
	err = withImmediateTx(ctx, a.db, func(conn *sql.Conn) error {
		// Ensure room exists
		var x string
		if err := conn.QueryRowContext(ctx, `SELECT id FROM rooms WHERE id = ?`, req.RoomID).Scan(&x); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return clientErr("room not found", http.StatusBadRequest)
			}
			return err
		}
		// Overlap check for active statuses
		if status == "PENDING" || status == "CONFIRMED" {
			ok, err := hasOverlapConn(ctx, conn, req.RoomID, startT.Unix(), endT.Unix(), "")
			if err != nil {
				return err
			}
			if ok {
				return clientErr("booking time overlaps existing booking", http.StatusConflict)
			}
		}
		_, err := conn.ExecContext(ctx, `INSERT INTO bookings(id, room_id, guest_id, starts_at, ends_at, status, created_at) VALUES(?,?,?,?,?,?,?)`,
			id, req.RoomID, req.GuestID, startT.Unix(), endT.Unix(), status, now)
		return err
	})
	if err != nil {
		if ce, ok := err.(*clientError); ok {
			writeError(w, ce.code, ce.Error())
			return
		}
		serverError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, Booking{ID: id, RoomID: req.RoomID, GuestID: req.GuestID, StartsAt: startT.UTC().Format(time.RFC3339), EndsAt: endT.UTC().Format(time.RFC3339), Status: status, CreatedAt: now})
}

type listBookingsFilters struct {
	RoomID string
	Status string
	From   *time.Time
	To     *time.Time
	Limit  int
	Offset int
}

func (a *App) listBookings(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filters := listBookingsFilters{Limit: 100, Offset: 0}
	filters.RoomID = q.Get("room_id")
	filters.Status = strings.ToUpper(strings.TrimSpace(q.Get("status")))
	if v := q.Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
			filters.Limit = n
		}
	}
	if v := q.Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			filters.Offset = n
		}
	}
	if v := q.Get("from"); v != "" {
		if t, err := parseRFC3339(v); err == nil {
			filters.From = &t
		}
	}
	if v := q.Get("to"); v != "" {
		if t, err := parseRFC3339(v); err == nil {
			filters.To = &t
		}
	}

	where := []string{"1=1"}
	args := []any{}
	if filters.RoomID != "" {
		where = append(where, "room_id = ?")
		args = append(args, filters.RoomID)
	}
	if filters.Status != "" {
		where = append(where, "status = ?")
		args = append(args, filters.Status)
	}
	if filters.From != nil {
		where = append(where, "ends_at > ?")
		args = append(args, filters.From.Unix())
	}
	if filters.To != nil {
		where = append(where, "starts_at < ?")
		args = append(args, filters.To.Unix())
	}

	rows, err := a.db.Query(`SELECT id, room_id, guest_id, starts_at, ends_at, status, created_at FROM bookings WHERE `+strings.Join(where, " AND ")+` ORDER BY starts_at LIMIT ? OFFSET ?`, append(args, filters.Limit, filters.Offset)...)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()

	// var list []Booking
	list := []Booking{} // 关键
	for rows.Next() {
		var br bookingRow
		if err := rows.Scan(&br.ID, &br.RoomID, &br.GuestID, &br.StartSec, &br.EndSec, &br.Status, &br.Created); err != nil {
			serverError(w, err)
			return
		}
		list = append(list, toBookingDTO(br))
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *App) getBooking(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var br bookingRow
	err := a.db.QueryRow(`SELECT id, room_id, guest_id, starts_at, ends_at, status, created_at FROM bookings WHERE id = ?`, id).Scan(&br.ID, &br.RoomID, &br.GuestID, &br.StartSec, &br.EndSec, &br.Status, &br.Created)
	if errors.Is(err, sql.ErrNoRows) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, toBookingDTO(br))
}

type updateBookingReq struct {
	RoomID   *string `json:"room_id"`
	GuestID  *string `json:"guest_id"`
	StartsAt *string `json:"starts_at"`
	EndsAt   *string `json:"ends_at"`
	Status   *string `json:"status"`
}

func (a *App) updateBooking(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// fetch current row first
	var cur bookingRow
	err := a.db.QueryRow(`SELECT id, room_id, guest_id, starts_at, ends_at, status, created_at FROM bookings WHERE id = ?`, id).Scan(&cur.ID, &cur.RoomID, &cur.GuestID, &cur.StartSec, &cur.EndSec, &cur.Status, &cur.Created)
	if errors.Is(err, sql.ErrNoRows) {
		notFound(w)
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}

	var req updateBookingReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		badRequest(w, "invalid JSON body")
		return
	}

	newRoomID := cur.RoomID
	if req.RoomID != nil {
		newRoomID = *req.RoomID
	}
	newGuestID := cur.GuestID
	if req.GuestID != nil {
		newGuestID = *req.GuestID
	}
	newStart := cur.StartSec
	if req.StartsAt != nil {
		st, err := parseRFC3339(*req.StartsAt)
		if err != nil {
			badRequest(w, "starts_at must be RFC3339")
			return
		}
		newStart = st.Unix()
	}
	newEnd := cur.EndSec
	if req.EndsAt != nil {
		et, err := parseRFC3339(*req.EndsAt)
		if err != nil {
			badRequest(w, "ends_at must be RFC3339")
			return
		}
		newEnd = et.Unix()
	}
	if newEnd <= newStart {
		badRequest(w, "ends_at must be after starts_at")
		return
	}
	newStatus := cur.Status
	if req.Status != nil {
		newStatus = strings.ToUpper(strings.TrimSpace(*req.Status))
		if !allowedStatus[newStatus] {
			badRequest(w, "invalid status")
			return
		}
	}

	ctx := r.Context()
	err = withImmediateTx(ctx, a.db, func(conn *sql.Conn) error {
		// Ensure room exists if changed
		if newRoomID != cur.RoomID {
			var x string
			if err := conn.QueryRowContext(ctx, `SELECT id FROM rooms WHERE id = ?`, newRoomID).Scan(&x); err != nil {
				if errors.Is(err, sql.ErrNoRows) {
					return clientErr("room not found", http.StatusBadRequest)
				}
				return err
			}
		}
		// Overlap check when status is active
		if newStatus == "PENDING" || newStatus == "CONFIRMED" {
			ok, err := hasOverlapConn(ctx, conn, newRoomID, newStart, newEnd, id)
			if err != nil {
				return err
			}
			if ok {
				return clientErr("booking time overlaps existing booking", http.StatusConflict)
			}
		}
		_, err := conn.ExecContext(ctx, `UPDATE bookings SET room_id=?, guest_id=?, starts_at=?, ends_at=?, status=? WHERE id=?`,
			newRoomID, newGuestID, newStart, newEnd, newStatus, id)
		return err
	})
	if err != nil {
		if ce, ok := err.(*clientError); ok {
			writeError(w, ce.code, ce.Error())
			return
		}
		serverError(w, err)
		return
	}

	a.getBooking(w, r)
}

func (a *App) deleteBooking(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	res, err := a.db.Exec(`DELETE FROM bookings WHERE id = ?`, id)
	if err != nil {
		serverError(w, err)
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		notFound(w)
		return
	}
	writeJSON(w, http.StatusNoContent, nil)
}

// ------------------------------------------------------------
// Overlap check helpers
// ------------------------------------------------------------

// returns true if overlap exists for [start,end) interval in given room.
func hasOverlapConn(ctx context.Context, conn *sql.Conn, roomID string, startSec, endSec int64, excludeID string) (bool, error) {
	q := `SELECT 1 FROM bookings 
		WHERE room_id = ?
			AND status IN ('PENDING','CONFIRMED')
			AND starts_at < ?
			AND ends_at > ?`
	args := []any{roomID, endSec, startSec}
	if excludeID != "" {
		q += " AND id <> ?"
		args = append(args, excludeID)
	}
	q += " LIMIT 1"
	var one int
	err := conn.QueryRowContext(ctx, q, args...).Scan(&one)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}

// Wrap a function in a BEGIN IMMEDIATE transaction using a single connection.
func withImmediateTx(ctx context.Context, db *sql.DB, fn func(conn *sql.Conn) error) error {
	conn, err := db.Conn(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()
	if _, err := conn.ExecContext(ctx, "BEGIN IMMEDIATE", nil); err != nil {
		return err
	}
	done := false
	defer func() {
		if !done {
			_, _ = conn.ExecContext(ctx, "ROLLBACK", nil)
		}
	}()
	if err := fn(conn); err != nil {
		_, _ = conn.ExecContext(ctx, "ROLLBACK", nil)
		return err
	}
	if _, err := conn.ExecContext(ctx, "COMMIT", nil); err != nil {
		return err
	}
	done = true
	return nil
}

// ------------------------------------------------------------
// Utilities: JSON, time, CORS, errors
// ------------------------------------------------------------

func parseRFC3339(s string) (time.Time, error) {
	// Accept both with and without seconds/nanos
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	// try common variants
	layouts := []string{
		"2006-01-02T15:04Z07:00",
		"2006-01-02 15:04:05Z07:00",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, fmt.Errorf("invalid RFC3339 time: %s", s)
}

func toBookingDTO(br bookingRow) Booking {
	return Booking{
		ID:        br.ID,
		RoomID:    br.RoomID,
		GuestID:   br.GuestID,
		StartsAt:  time.Unix(br.StartSec, 0).UTC().Format(time.RFC3339),
		EndsAt:    time.Unix(br.EndSec, 0).UTC().Format(time.RFC3339),
		Status:    br.Status,
		CreatedAt: br.Created,
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	if v == nil {
		w.WriteHeader(code)
		return
	}
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func badRequest(w http.ResponseWriter, msg string) { writeError(w, http.StatusBadRequest, msg) }
func notFound(w http.ResponseWriter)               { writeError(w, http.StatusNotFound, "not found") }
func conflict(w http.ResponseWriter, msg string)   { writeError(w, http.StatusConflict, msg) }

func serverError(w http.ResponseWriter, err error) {
	log.Printf("server error: %v", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}

func writeError(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]any{"error": msg, "code": code})
}

func getenv(k, def string) string {
	// if v := os.LookupEnv(k); v {
	// 	return v
	// }
	if v, ok := os.LookupEnv(k); ok {
		return v
	}

	return def
}

// Very small unique violation detector (SQLite: result code 2067)
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "unique") || strings.Contains(s, "constraint failed")
}

// Simple CORS middleware (allow all origins by default).
func corsMiddleware() func(http.Handler) http.Handler {
	allowOrigin := getenv("CORS_ALLOW_ORIGIN", "*")
	allowHeaders := getenv("CORS_ALLOW_HEADERS", "Content-Type, Authorization, X-Requested-With")
	allowMethods := getenv("CORS_ALLOW_METHODS", "GET, POST, PATCH, DELETE, OPTIONS")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowOrigin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", allowMethods)
			w.Header().Set("Access-Control-Allow-Headers", allowHeaders)
			w.Header().Set("Access-Control-Allow-Credentials", "false")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

type clientError struct {
	msg  string
	code int
}

func (e *clientError) Error() string       { return e.msg }
func clientErr(msg string, code int) error { return &clientError{msg: msg, code: code} }
