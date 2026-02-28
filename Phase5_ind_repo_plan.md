# Phase 5 獨立 Repo 執行計畫
## `bbdsl-platform`：Convention Registry + 線上編輯器 + 社群功能

> **對應計畫書**：`BBDSL_IMPLEMENTATION-PLAN.md` § Phase 5（第 24-32 週）
> **依賴關係**：本 repo (`bbdsl`) 為核心 Python 套件，`bbdsl-platform` 以 PyPI 套件形式依賴它

---

## 1. 新 Repo 基本資訊

| 項目 | 內容 |
|------|------|
| **Repo 名稱** | `bbdsl-platform` |
| **建議位置** | 同一 GitHub org（或個人帳號）下 |
| **性質** | 全端 Web 應用程式（後端 API + 前端 SPA） |
| **授權** | MIT（程式碼）；Registry 內容繼承 CC-BY-SA-4.0 |
| **主要技術** | FastAPI · React · PostgreSQL · OAuth 2.0 |

---

## 2. 從本 Repo 轉移 / 複製的資訊

### 2.1 直接複製（作為種子資料或文件參考）

| 來源路徑（本 repo） | 目標路徑（bbdsl-platform） | 用途 |
|--------------------|-----------------------------|------|
| `examples/precision.bbdsl.yaml` | `seed/conventions/precision.bbdsl.yaml` | Registry 初始種子資料 |
| `examples/sayc.bbdsl.yaml` | `seed/conventions/sayc.bbdsl.yaml` | Registry 初始種子資料 |
| `examples/two_over_one.bbdsl.yaml` | `seed/conventions/two_over_one.bbdsl.yaml` | Registry 初始種子資料 |
| `bbdsl-schema-v0.3.json` | `docs/schema/bbdsl-schema-v0.3.json` | API 文件中的 Schema 參考 |
| `BBDSL-SPEC-v0.3.md` | `docs/spec/BBDSL-SPEC-v0.3.md` | 開發人員參考文件 |
| `BBDSL-SUPPLEMENT-v0.3.md` | `docs/spec/BBDSL-SUPPLEMENT-v0.3.md` | 開發人員參考文件 |
| `README-bbDsl.md`（若存在） | `docs/bbdsl-intro.md` | 嵌入平台說明頁面 |

### 2.2 不轉移（留在本 repo，以套件形式使用）

| 類別 | 原因 |
|------|------|
| `bbdsl/` 所有 Python 原始碼 | 透過 `pip install bbdsl` 引入，不重複維護 |
| `tests/` | 屬於 bbdsl 套件的品質保證，保留在原處 |
| `bbdsl/cli/main.py` | CLI 工具仍由本 repo 發布；平台後端呼叫套件 API |
| `BBDSL_IMPLEMENTATION-PLAN.md` | 本 repo 的路線圖文件，平台 repo 僅引用連結 |

### 2.3 共享文件（兩個 repo 都連結，不重複）

- `BBDSL-SPEC-v0.3.md` → 以 git submodule 或外部連結方式參考
- `bbdsl-schema-v0.3.json` → 平台後端呼叫 `bbdsl` 套件動態取得（`bbdsl schema` 命令）

---

## 3. 新 Repo 目錄結構

```
bbdsl-platform/
├── README.md
├── LICENSE                        # MIT
├── docker-compose.yml             # 本地開發：API + DB + 前端
├── .env.example
│
├── backend/                       # FastAPI 後端
│   ├── pyproject.toml             # 依賴：bbdsl>=0.4, fastapi, sqlalchemy, etc.
│   ├── alembic/                   # 資料庫遷移
│   ├── app/
│   │   ├── main.py                # FastAPI app 進入點
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── registry.py    # Convention Registry CRUD
│   │   │   │   ├── validate.py    # 即時驗證端點（WebSocket）
│   │   │   │   ├── export.py      # 匯出端點（BBOalert/BML/PBN/SVG）
│   │   │   │   ├── compare.py     # 制度比較端點
│   │   │   │   └── auth.py        # OAuth 登入/登出
│   │   ├── models/                # SQLAlchemy ORM 模型
│   │   │   ├── user.py
│   │   │   ├── convention.py
│   │   │   └── rating.py
│   │   ├── services/
│   │   │   ├── bbdsl_service.py   # 封裝 bbdsl 套件呼叫
│   │   │   ├── registry_service.py
│   │   │   └── diff_service.py    # 制度結構化 diff 邏輯
│   │   └── core/
│   │       ├── config.py          # 環境設定
│   │       ├── security.py        # JWT + OAuth
│   │       └── database.py        # DB 連線池
│   └── tests/
│       ├── test_registry_api.py
│       ├── test_validate_ws.py
│       └── test_export_api.py
│
├── frontend/                      # React 前端
│   ├── package.json               # 依賴：react, monaco-editor, etc.
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── Registry.tsx       # Convention 搜尋/瀏覽
│   │   │   ├── Editor.tsx         # 線上 YAML 編輯器
│   │   │   ├── Diff.tsx           # 制度比較視覺化
│   │   │   └── Profile.tsx        # 使用者頁面
│   │   ├── components/
│   │   │   ├── YamlEditor/        # Monaco Editor 封裝
│   │   │   ├── BiddingTree/       # 叫牌樹預覽（重用 bbdsl SVG/HTML）
│   │   │   ├── ValidationPanel/   # 即時驗證結果面板
│   │   │   └── DiffViewer/        # 左右對照差異視覺化
│   │   └── lib/
│   │       ├── api.ts             # API 客戶端
│   │       └── ws.ts              # WebSocket 客戶端（驗證）
│   └── tests/
│
├── seed/                          # 種子資料（從本 repo 複製）
│   └── conventions/
│       ├── precision.bbdsl.yaml
│       ├── sayc.bbdsl.yaml
│       └── two_over_one.bbdsl.yaml
│
├── docs/
│   ├── spec/                      # 從本 repo 複製的規格書
│   ├── api/                       # OpenAPI 文件
│   └── deployment.md
│
└── .github/
    ├── workflows/
    │   ├── backend-ci.yml
    │   ├── frontend-ci.yml
    │   └── deploy.yml
    └── dependabot.yml
```

---

## 4. 技術選型

| 層級 | 技術 | 理由 |
|------|------|------|
| 後端框架 | **FastAPI** | 非同步、OpenAPI 自動產生、與 Pydantic v2 原生相容（和 bbdsl 模型一致） |
| 資料庫 | **PostgreSQL** | 生產環境；本地開發可用 SQLite |
| ORM | **SQLAlchemy 2.0** + Alembic | 型別安全、遷移管理 |
| 驗證通訊 | **WebSocket** | 即時驗證 < 500ms 目標 |
| OAuth | **GitHub + Google**（via `authlib`） | 最低摩擦力，橋牌技術社群多用 GitHub |
| JWT | **python-jose** | 無狀態 Session |
| 前端框架 | **React 18** + TypeScript | 社群生態、可維護性 |
| 建置工具 | **Vite** | 快速 HMR，TypeScript 原生支援 |
| YAML 編輯器 | **Monaco Editor**（`@monaco-editor/react`） | VSCode 同款，支援自訂語言語法高亮 |
| 樣式 | **Tailwind CSS** | 快速迭代 |
| 容器化 | **Docker** + docker-compose | 本地開發環境一致性 |
| 部署 | **Railway / Fly.io**（後端）+ **Vercel**（前端） | 免費額度適合 MVP |
| bbdsl 套件引入 | `pip install bbdsl` 或 `pip install git+https://github.com/.../bbdsl` | 不重複維護核心邏輯 |

---

## 5. Sprint 執行計畫

### Sprint 5.0（前置作業，1 週）：Repo 建立與基礎設施

| 任務 | 說明 |
|------|------|
| 建立 `bbdsl-platform` GitHub repo | 設定 MIT 授權、.gitignore、branch protection |
| 複製種子資料 | 從本 repo 複製 `examples/` 三個 YAML 到 `seed/conventions/` |
| 複製規格文件 | 複製 `BBDSL-SPEC-v0.3.md`、`BBDSL-SUPPLEMENT-v0.3.md`、`bbdsl-schema-v0.3.json` 到 `docs/spec/` |
| 建立 docker-compose | PostgreSQL + FastAPI + Vite 開發環境 |
| 後端骨架 | FastAPI app、SQLAlchemy 連線、Alembic 初始化 |
| 前端骨架 | Vite + React + TypeScript + Tailwind 初始化 |
| CI/CD | GitHub Actions：後端測試 + 前端 build check |
| 發布 `bbdsl` 至 PyPI | 確認本 repo 的 bbdsl 套件可 `pip install`（或以 git URL 引用） |

---

### Sprint 5.1（第 25-27 週）：Convention Registry

**目標**：使用者可以上傳、搜尋、安裝 Convention 模組；種子資料已可瀏覽。

#### 後端任務

| # | 任務 | 說明 |
|---|------|------|
| 5.1.1 | 資料庫 Schema 設計 | `conventions`（id, name, namespace, version, yaml_content, author_id, tags, downloads）、`users`（id, github_id, name）表 |
| 5.1.2 | REST API：Convention CRUD | `POST /api/v1/conventions`（上傳）、`GET /api/v1/conventions/{id}`、`GET /api/v1/conventions`（搜尋） |
| 5.1.3 | 上傳時自動驗證 | 呼叫 `bbdsl.core.validator.Validator` 執行 14 條規則；驗證失敗則拒絕上傳 |
| 5.1.4 | 搜尋端點 | by `name`、`tags`、`namespace`、`author`；支援分頁 |
| 5.1.5 | 版本管理 | namespace + SemVer 唯一性約束；`GET /api/v1/conventions/{namespace}/{version}` |
| 5.1.6 | Namespace 申請 API | `POST /api/v1/namespaces`（登入後才能申請） |
| 5.1.7 | CLI 整合 | 在本 repo 的 `bbdsl/cli/main.py` 新增 `bbdsl registry publish/search/install` 命令（需平台 API token） |

#### 前端任務

| # | 任務 | 說明 |
|---|------|------|
| 5.1.8 | Registry 首頁 | Convention 列表、搜尋框、tag 篩選 |
| 5.1.9 | Convention 詳細頁 | YAML 預覽、版本歷史、下載按鈕 |
| 5.1.10 | 種子資料匯入腳本 | `python seed/load_seed.py`：將三個 YAML 上傳至 Registry |

**完成標準**：3 個種子制度可搜尋，API 可正常 CRUD，驗證失敗的 YAML 被拒絕。

---

### Sprint 5.2（第 28-30 週）：線上編輯器

**目標**：使用者在瀏覽器即時編寫 BBDSL YAML，看到驗證結果與叫牌樹預覽。

#### 後端任務

| # | 任務 | 說明 |
|---|------|------|
| 5.2.1 | WebSocket 驗證端點 | `WS /api/v1/validate`：接收 YAML 文字，回傳 `ValidationReport` JSON；目標延遲 < 500ms |
| 5.2.2 | 匯出端點 | `POST /api/v1/export/{format}`（`bboalert`、`bml`、`pbn`、`svg`、`html`）：呼叫對應 exporter，回傳檔案 |
| 5.2.3 | 草稿儲存 API | `POST /api/v1/drafts`（登入後）：儲存未發布的 YAML |
| 5.2.4 | 分享端點 | `POST /api/v1/share`：建立永久連結（hash-based URL）；`GET /api/v1/share/{hash}` |

#### 前端任務

| # | 任務 | 說明 |
|---|------|------|
| 5.2.5 | Monaco Editor 整合 | YAML 語法高亮、自動縮排、Ctrl+Z/Y 支援 |
| 5.2.6 | BBDSL 語法高亮 | 自訂 Monaco language：`bid`、`meaning`、`hand`、`hcp`、`foreach_suit` 等關鍵字高亮 |
| 5.2.7 | 即時驗證面板 | WebSocket 連線，輸入 500ms 後觸發驗證；錯誤以紅色標示，警告以黃色 |
| 5.2.8 | 叫牌樹預覽 | 右側面板嵌入 bbdsl SVG 輸出（`/api/v1/export/svg`）；編輯後自動更新 |
| 5.2.9 | Convention 插入 | 左側 Registry 瀏覽面板；點擊 Convention → 自動插入 `use_conventions:` 區塊 |
| 5.2.10 | 匯出按鈕 | 工具列匯出為 BBOalert / BML / PBN；呼叫匯出 API 下載檔案 |
| 5.2.11 | 分享功能 | 複製永久連結按鈕；分享頁面顯示唯讀編輯器 |

**完成標準**：輸入 `examples/precision.bbdsl.yaml` 內容，能在 1 秒內看到 14 條驗證結果與 SVG 叫牌樹。

---

### Sprint 5.3（第 31-32 週）：Diff/Merge + 社群功能

**目標**：可比較兩個制度的結構差異；使用者可登入、評分、留言。

#### 後端任務

| # | 任務 | 說明 |
|---|------|------|
| 5.3.1 | OAuth 登入 | GitHub OAuth（`authlib`）；登入後發 JWT；`GET /api/v1/me` |
| 5.3.2 | Google OAuth | 同上 |
| 5.3.3 | 制度結構化 Diff API | `POST /api/v1/diff`：body 含兩份 YAML；回傳結構化差異（叫品層級，非文字 diff）；內部呼叫 `bbdsl.core.comparator.compare_systems` 邏輯 |
| 5.3.4 | 評分 API | `POST /api/v1/conventions/{id}/ratings`（1-5 星）；`GET` 統計平均分 |
| 5.3.5 | 留言 API | `POST /api/v1/conventions/{id}/comments`；`GET` 分頁列表 |
| 5.3.6 | 推薦 API | `GET /api/v1/recommendations`：依使用者已安裝的 Convention namespace 推薦相關模組 |
| 5.3.7 | LIN 整合 | `POST /api/v1/export/lin`：將 PBN 模擬結果轉 LIN 格式；可嵌入 HandViewer `<iframe>` |

#### 前端任務

| # | 任務 | 說明 |
|---|------|------|
| 5.3.8 | Diff 頁面 | 左右各一個 YAML 選擇器（Registry 或貼上）；點擊比較後顯示差異 |
| 5.3.9 | Diff 視覺化 | 叫品層級對照表：相同（綠）、A 有 B 沒有（橘）、B 有 A 沒有（藍）、HCP 不同（紅） |
| 5.3.10 | OAuth 登入 UI | 右上角「Login with GitHub / Google」按鈕 |
| 5.3.11 | 評分 + 留言 UI | Convention 詳細頁下方：星星評分 + 留言串 |
| 5.3.12 | 使用者個人頁 | 已發布的 Convention、已安裝的模組、活動記錄 |

**完成標準**：精準制 vs SAYC diff 正確顯示差異叫品；5 個真實使用者可登入並留言評分。

---

## 6. `bbdsl_service.py`：後端封裝 bbdsl 套件的方式

平台後端不直接操作 BBDSL 模型，改透過 `services/bbdsl_service.py` 封裝所有 bbdsl 呼叫：

```python
# backend/app/services/bbdsl_service.py
from bbdsl.core.loader import load_document
from bbdsl.core.validator import Validator
from bbdsl.core.comparator import compare_systems
from bbdsl.exporters.bboalert_exporter import export_bboalert
from bbdsl.exporters.bml_exporter import export_bml
from bbdsl.exporters.svg_tree import export_svg
from bbdsl.exporters.html_exporter import export_html
from bbdsl.exporters.pbn_exporter import export_pbn
import io, yaml

def validate_yaml(content: str) -> dict:
    """接收 YAML 字串，回傳驗證報告 dict（JSON 可序列化）。"""
    doc = load_document(io.StringIO(content))
    report = Validator().validate_all(doc)
    return report.to_dict()

def export(content: str, fmt: str, **kwargs) -> str:
    """接收 YAML 字串與格式，回傳匯出結果字串。"""
    doc = load_document(io.StringIO(content))
    exporters = {
        "bboalert": export_bboalert,
        "bml": export_bml,
        "svg": export_svg,
        "html": export_html,
        "pbn": export_pbn,
    }
    return exporters[fmt](doc, **kwargs)

def diff(content_a: str, content_b: str, n_deals: int = 20, seed: int = 42) -> dict:
    """比較兩份制度，回傳 ComparisonReport dict。"""
    doc_a = load_document(io.StringIO(content_a))
    doc_b = load_document(io.StringIO(content_b))
    report = compare_systems(doc_a, doc_b, n_deals=n_deals, seed=seed)
    return report.to_dict()
```

> **注意**：`load_document` 目前接受檔案路徑。若需要接受字串，需在本 repo 新增一個小型包裝函數 `load_document_from_string(content: str)`，或在平台端用 `tempfile` 暫存。

---

## 7. 本 Repo 需要配合做的小修改

在啟動 bbdsl-platform 前，本 repo 有幾個準備工作：

| 項目 | 修改說明 | 優先級 |
|------|----------|--------|
| **發布至 PyPI** | 在 `pyproject.toml` 設定版本（建議 `0.4.0`），透過 `uv publish` 上傳至 PyPI | 高 |
| **`load_document` 支援字串輸入** | 新增 `load_document_from_string(yaml_str: str) -> BBDSLDocument`，讓平台後端不需暫存檔案 | 高 |
| **`ValidationReport.to_dict()` 完整可序列化** | 確認所有欄位（含 `rule_id`、`severity`、`message`）都能 JSON 序列化，供 WebSocket 回傳 | 中 |
| **`bbdsl registry` CLI 命令** | Sprint 5.1.7：在 `cli/main.py` 加入 `registry` 命令群（publish/search/install） | 中 |
| **`export_svg` 接受字串輸出** | 目前部分 exporter 只寫檔案；確認所有 exporter 在 `output_path=None` 時都回傳字串 | 低（現已大多支援）|

---

## 8. 部署策略

### 開發環境（本機）

```bash
# 啟動所有服務
docker-compose up

# 載入種子資料
cd backend && python seed/load_seed.py

# 前端開發
cd frontend && npm run dev
```

### 生產環境（MVP 階段）

| 服務 | 平台 | 說明 |
|------|------|------|
| 後端 API | **Railway** 或 **Fly.io** | FastAPI + Uvicorn；免費額度夠 MVP |
| 資料庫 | Railway PostgreSQL | 自動備份、SSL |
| 前端 SPA | **Vercel** | 直接連 GitHub 自動部署，CDN |
| 靜態資源 | Vercel Edge Network | YAML 預覽、SVG 圖 |
| 環境變數 | Railway / Vercel 環境設定 | `DATABASE_URL`、`GITHUB_CLIENT_ID`、`JWT_SECRET` 等 |

---

## 9. 執行時間表

```
週次    工作
────────────────────────────────────
Week 0  Repo 建立 + 基礎設施 + 種子資料複製
Week 1  Sprint 5.1 後端（Registry CRUD + 驗證）
Week 2  Sprint 5.1 前端（Registry UI）+ CLI
Week 3  Sprint 5.2 後端（WebSocket 驗證 + 匯出 API）
Week 4  Sprint 5.2 前端（Monaco Editor + 即時驗證 + 預覽）
Week 5  Sprint 5.3 後端（OAuth + Diff + 評分）
Week 6  Sprint 5.3 前端（Diff 視覺化 + 社群 UI）
Week 7  整合測試 + 部署 + 文件
Week 8  使用者測試 + Bug Fix + 正式上線
```

---

## 10. 完成標準（驗收）

| 功能 | 驗收條件 |
|------|----------|
| Registry | 3 個種子制度可搜尋；使用者可上傳 YAML 並自動驗證 |
| 線上編輯器 | 貼入 `precision.bbdsl.yaml`，驗證結果 < 500ms，SVG 預覽 < 1s |
| Diff/Merge | 精準制 vs SAYC 差異叫品正確顯示（與 `bbdsl compare` 結果一致） |
| 社群功能 | GitHub OAuth 登入可用；Convention 可評分與留言 |
| 部署 | 平台 URL 公開可訪問；前後端分離部署 |
