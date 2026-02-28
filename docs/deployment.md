# 部署指南

## 本地開發

### 使用 Docker Compose

```bash
# 複製並編輯環境設定
cp .env.example .env

# 啟動全部服務
docker-compose up

# 前端：http://localhost:5173
# 後端 API：http://localhost:8000
# API 文件：http://localhost:8000/docs
```

### 手動啟動

#### 後端

```bash
cd backend
pip install -e ".[dev]"

# 初始化資料庫（開發模式使用 SQLite）
# 生產環境請使用 Alembic migration

# 啟動
uvicorn app.main:app --reload --port 8000
```

#### 前端

```bash
cd frontend
npm install
npm run dev
```

## 生產環境部署

### 後端（Railway / Fly.io）

1. 在 Railway 建立新專案
2. 連結 GitHub repo，設定 root directory 為 `backend/`
3. 新增 PostgreSQL 附加服務
4. 設定環境變數：
   - `DATABASE_URL`（Railway 自動注入）
   - `JWT_SECRET`（隨機安全字串）
   - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - `CORS_ORIGINS`（前端域名）

### 前端（Vercel）

1. 在 Vercel 匯入 GitHub repo
2. 設定 Framework Preset 為 Vite
3. 設定 Root Directory 為 `frontend/`
4. 設定環境變數：
   - `VITE_API_URL`（後端 API URL）

### 資料庫遷移

```bash
cd backend
alembic upgrade head
```

## 健康檢查

- 後端：`GET /health` → `{"status": "ok", "version": "0.1.0"}`
- 前端：直接訪問首頁

## 監控

建議使用：
- Railway / Fly.io 內建日誌
- Sentry（錯誤追蹤）
- Uptime Robot（可用性監控）
