// README.md (unchanged, as no new instructions)
# Golang Blog Backend with Frontend

This is a simple personal blog system with backend API built with Go, Gin, GORM, and SQLite3, and a frontend using pure HTML, CSS, JS.

## Setup

1. Install dependencies: `go mod tidy`
2. Run the server: `go run cmd/main.go`
3. Open `frontend/index.html` in a browser (or serve it via a simple server for CORS, but since backend allows *, it should work).

Database will be created automatically as `blog.db`.

## API Endpoints

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/profile (auth required)
- GET /api/v1/posts
- GET /api/v1/posts/:id
- POST /api/v1/posts (auth required)
- PUT /api/v1/posts/:id (auth required, author only)
- DELETE /api/v1/posts/:id (auth required, author only)
- GET /api/v1/comments/post/:post_id
- POST /api/v1/posts/:post_id/comments (auth required)
- GET /health

## Frontend

The frontend is in the `frontend/` directory. It handles all API interactions, authentication with JWT stored in localStorage, and conditional rendering based on login status. Edit/Delete only shown for own posts (enforced by backend).

Note: For production, serve frontend and backend properly, use secure JWT secret, HTTPS, etc.
