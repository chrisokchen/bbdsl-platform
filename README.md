# BBDSL Platform

**Convention Registry · 線上編輯器 · 社群功能**

> Bridge Bidding Description Specification Language (BBDSL) 的全端 Web 應用程式

## 功能

- **Convention Registry**：上傳、搜尋、安裝橋牌叫牌制度模組
- **線上編輯器**：Monaco Editor + 即時 YAML 驗證 + SVG 叫牌樹預覽
- **制度比較**：結構化 Diff 視覺化（叫品層級對照）
- **多格式匯出**：BML / BBOalert / PBN / HTML / SVG
- **社群功能**：GitHub/Google OAuth 登入、評分、留言

## 技術棧

| 層級 | 技術 |
|------|------|
| 後端 | FastAPI · SQLAlchemy 2.0 · PostgreSQL · Alembic |
| 前端 | React 18 · TypeScript · Vite · Tailwind CSS · Monaco Editor |
| 核心引擎 | [`bbdsl`](https://github.com/chrisokchen/bbDsl) Python 套件 |
| 認證 | GitHub + Google OAuth（authlib + python-jose JWT） |
| 部署 | Docker · Railway/Fly.io（後端）· Vercel（前端） |

## 快速開始

### 使用 Docker（推薦）

```bash
# 複製環境設定
cp .env.example .env

# 啟動所有服務（API + PostgreSQL + 前端）
docker-compose up

# 載入種子資料
docker-compose exec backend python -m app.seed
```

### 手動安裝

```bash
# 後端
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

## 目錄結構

```
bbdsl-platform/
├── backend/           FastAPI 後端 API
│   ├── app/
│   │   ├── api/v1/    REST + WebSocket 端點
│   │   ├── models/    SQLAlchemy ORM 模型
│   │   ├── services/  bbdsl 套件封裝層
│   │   └── core/      設定、安全、資料庫
│   └── tests/
├── frontend/          React SPA
│   └── src/
│       ├── pages/     Registry · Editor · Diff · Profile
│       ├── components/
│       └── lib/       API + WebSocket 客戶端
├── seed/              種子 Convention 資料
├── docs/              規格書 + API 文件
└── .github/workflows/ CI/CD
```

## 開發

```bash
# 後端測試
cd backend && pytest

# 前端測試
cd frontend && npm test

# Lint
cd backend && ruff check .
cd frontend && npm run lint
```

## 授權

- 程式碼：MIT License
- Convention 內容：CC-BY-SA-4.0

## 相關專案

- [bbdsl](https://github.com/chrisokchen/bbDsl) — BBDSL 核心 Python 套件（CLI + 驗證 + 匯出）
