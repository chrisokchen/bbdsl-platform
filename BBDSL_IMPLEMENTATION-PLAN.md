# BBDSL 實作計畫書
## 從 Schema 到工具鏈到社群平台的完整路線圖

---

## 架構決策記錄（ADR）

> 以下為規格書審閱後確認的設計決策，作為後續實作的權威參考。

### ADR-1: 雙軌授權（Dual Licensing）

- **程式碼**（`bbdsl/` 套件、CLI、匯入匯出器、所有 `.py` 檔案）：**MIT License**
- **Convention 檔案**（`registry/`、`examples/conventions/` 下的 `.bbdsl-conv.yaml`）：**CC-BY-SA-4.0**
- 根目錄 `LICENSE` 為 MIT，另有 `LICENSE-CC-BY-SA-4.0` 和 `LICENSING.md` 聲明雙軌授權

### ADR-2: 套件管理 — uv

採用 **uv**（搭配 `pyproject.toml` + `uv.lock`），不使用 poetry。CI/CD 和貢獻者指南統一以 uv 為準。

### ADR-3: Phase 1 驗證規則 — Stub 策略

Phase 1 實作 8 條驗證規則（val-002, 004, 005, 006, 007, 008, 011, 012）。
尚未實作的 val-001（hcp-coverage）和 val-003（response-complete）以 **stub** 形式存在，
執行時產出 `warning: "此規則將於 Phase 2 完整實作"` 而非跳過，確保驗證報告結構一致。

### ADR-4: UnresolvedNode 分層設計（取代 `_unresolved` / `_bml_original`）

BML 匯入的未解析節點**不使用底線前綴**，改為**繼承/多型分層**設計：

```python
from pydantic import BaseModel, Field
from typing import Union, List

# 標準節點（核心 Schema 保持乾淨）
class CallNode(BaseModel):
    call: str
    condition: str | None = None
    meaning: str | None = None
    next: list["Node"] = []

# 匯入失敗的未解析節點（與 CallNode 同層級，允許混居）
class UnresolvedNode(BaseModel):
    is_unresolved: bool = Field(default=True, const=True)
    bml_original: str       # 原始 BML 文字，保留證據
    reason: str             # 解析失敗原因

# 叫牌樹允許兩種節點混合
Node = Union[CallNode, UnresolvedNode]
```

**工作流**：
1. 匯入時：解析成功 → `CallNode`；失敗 → `UnresolvedNode`（含原始文字和失敗原因）
2. 使用者手動修復：在 YAML 中看到 `is_unresolved: true` 區塊，參考 `bml_original` 改寫
3. 驗證/編譯時：偵測到 `UnresolvedNode` → 產出 error，阻止匯出，強制修完才能打包

### ADR-5: OpponentPattern 匹配邏輯歸屬

`OpponentPattern` Pydantic 模型為**純資料結構**，不放 `matches()` 方法。
匹配邏輯移至 `core/opponent_matcher.py` 作為獨立 service（Phase 2 實作）。

### ADR-6: BML 匯入測試語料庫

目標「HCP/花色長度正確提取率 > 80%」基於 **10 份公開 BML 範例**（涵蓋不同作者與風格）。
測試語料庫置於 `tests/fixtures/bml_samples/`，每份 BML 附帶預期提取結果的 JSON。

### ADR-7: Phase 5 獨立 Repo

Phase 5（社群平台：FastAPI + React + PostgreSQL + OAuth）**獨立為另一個 repo**，
本 repo（`bbdsl`）專注於 Phase 1-4 的 Python CLI 工具鏈。
Phase 5 repo 以 `bbdsl` 作為核心依賴，透過 API 呼叫核心驗證/匯出功能。

### ADR-8: Phase 優先級

當時間不足時，按以下順序取捨：

**Phase 1 (MVP) → Phase 2 (實戰價值) → Phase 3 (視覺化) → Phase 4 (AI 整合) → Phase 5 (社群平台)**

Phase 3 優先於 Phase 4，因為視覺化對橋牌教學社群的即時價值更高。

---

## 總覽

```
Phase 1          Phase 2          Phase 3          Phase 4          Phase 5
Schema+MVP       實戰價值          視覺化+教學       AI 整合           社群平台
(0→6 週)         (6→12 週)        (12→18 週)       (18→24 週)       (24→32 週)
────────────────────────────────────────────────────────────────────────────
├ JSON Schema    ├ BBOalert 匯出   ├ HTML Viewer    ├ AI KB 匯出      ├ Registry
├ 展開器         ├ BBOalert 匯入   ├ Conv Card 產生  ├ Dealer 雙向轉換  ├ 線上編輯器
├ 驗證器(8 規則) ├ BML 匯出        ├ SVG 叫牌樹     ├ 模擬對練引擎     ├ Diff/Merge
├ BML 匯入 MVP   ├ 選擇引擎       ├ 練習題產生器    ├ 制度比較器       ├ LIN 整合
└ 精準制範例      └ SAYC+2/1 範例  └ 教學模式        └ PBN 匯出        └ 社群評分
```

---

## 技術基礎設施

### 專案結構

```
bbdsl/
├── pyproject.toml                # Python 專案設定
├── README.md
├── LICENSE                       # MIT (程式碼)
├── LICENSE-CC-BY-SA-4.0          # CC-BY-SA-4.0 (Convention 檔案)
├── LICENSING.md                  # 雙軌授權聲明
│
├── schema/                       # JSON Schema 定義
│   ├── bbdsl-v0.3.json
│   └── bbdsl-convention-v0.3.json
│
├── bbdsl/                        # 核心 Python 套件
│   ├── __init__.py
│   ├── models/                   # Pydantic 資料模型
│   │   ├── __init__.py
│   │   ├── system.py             # SystemMetadata, Definitions
│   │   ├── bid.py                # BidNode, BidMeaning, HandConstraint
│   │   ├── convention.py         # Convention, ConventionParameter
│   │   ├── context.py            # Context, OpponentPattern, ContextOverride
│   │   └── common.py             # I18nString, Range, ForcingLevel, etc.
│   │
│   ├── core/                     # 核心引擎
│   │   ├── __init__.py
│   │   ├── loader.py             # YAML 載入 + JSON Schema 驗證
│   │   ├── expander.py           # foreach_suit 展開器
│   │   ├── validator.py          # 14 條語義驗證規則
│   │   ├── selector.py           # selection_rules 叫牌選擇引擎
│   │   └── opponent_matcher.py   # OpponentPattern 匹配邏輯（ADR-5）
│   │
│   ├── importers/                # 匯入器
│   │   ├── __init__.py
│   │   ├── bml_importer.py       # BML → BBDSL
│   │   └── bboalert_importer.py  # BBOalert → BBDSL
│   │
│   ├── exporters/                # 匯出器
│   │   ├── __init__.py
│   │   ├── bboalert_exporter.py  # BBDSL → BBOalert
│   │   ├── bml_exporter.py       # BBDSL → BML (HTML/LaTeX)
│   │   ├── convcard_exporter.py  # BBDSL → Convention Card (WBF/ACBL)
│   │   ├── pbn_exporter.py       # BBDSL → PBN annotation
│   │   └── ai_kb_exporter.py     # BBDSL → JSON/JSONL for RAG
│   │
│   ├── viewer/                   # 視覺化
│   │   ├── __init__.py
│   │   ├── html_viewer.py        # 互動式 HTML 產生器
│   │   ├── svg_tree.py           # 叫牌樹 SVG 圖表
│   │   └── templates/            # Jinja2 模板
│   │
│   ├── ai/                       # AI 整合
│   │   ├── __init__.py
│   │   ├── dealer_bridge.py      # Dealer script ↔ BBDSL 雙向轉換
│   │   ├── practice_gen.py       # 練習題自動產生器
│   │   ├── sim_engine.py         # 模擬對練引擎
│   │   └── comparator.py         # 制度比較器
│   │
│   └── cli/                      # 命令列介面
│       ├── __init__.py
│       └── main.py               # CLI 進入點
│
├── examples/                     # 範例制度
│   ├── precision.bbdsl.yaml      # 精準制
│   ├── sayc.bbdsl.yaml           # SAYC
│   ├── two_over_one.bbdsl.yaml   # 2/1 Game Forcing
│   └── conventions/              # 獨立 Convention 模組
│       ├── stayman-v1.bbdsl-conv.yaml
│       ├── jacoby-transfer-v1.bbdsl-conv.yaml
│       ├── puppet-stayman-v1.bbdsl-conv.yaml
│       └── lebensohl-v1.bbdsl-conv.yaml
│
├── tests/                        # 測試
│   ├── conftest.py               # pytest fixtures
│   ├── test_models/
│   ├── test_core/
│   ├── test_importers/
│   ├── test_exporters/
│   └── fixtures/                 # 測試用 YAML 檔案
│       ├── valid/
│       ├── invalid/
│       └── bml_samples/
│
└── docs/                         # 文件
    ├── spec/                     # BBDSL 規格書
    │   ├── BBDSL-SPEC-v0.3.md
    │   └── BBDSL-SUPPLEMENT-v0.3.md
    └── guides/                   # 使用者指南
        ├── getting-started.md
        ├── writing-conventions.md
        └── migration-from-bml.md
```

### 技術選型

| 項目 | 選擇 | 理由 |
|------|------|------|
| 語言 | Python 3.11+ | 生態系最豐富、AI/資料處理首選 |
| 資料模型 | Pydantic v2 | 型別驗證、JSON Schema 產生、IDE 友善 |
| YAML 解析 | ruamel.yaml | 保留註解和格式、round-trip 能力 |
| JSON Schema | jsonschema | 標準實作 |
| CLI | Click | 簡潔、可組合 |
| 模板引擎 | Jinja2 | HTML/BML/BBOalert 匯出共用 |
| 測試 | pytest + hypothesis | property-based testing 適合驗證規則 |
| 套件管理 | uv + pyproject.toml + uv.lock | 現代 Python 專案標準（見 ADR-2） |
| 文件 | mkdocs-material | 技術文件標準 |

---

## Phase 1: Schema 穩定化 + MVP 工具（0 → 6 週）

### 🎯 里程碑目標
> **一個人可以用 CLI 載入 BBDSL YAML、展開 foreach_suit、執行 8 條驗證規則、
> 從 BML 匯入基本制度，並看到結構化的驗證報告。**

### Sprint 1.1（第 1-2 週）：地基

#### 任務清單

| # | 任務 | 產出 | 預估工時 |
|---|------|------|----------|
| 1.1.1 | 初始化專案結構 | pyproject.toml, bbdsl/ 骨架 | 2h |
| 1.1.2 | Pydantic 資料模型 — common | I18nString, Range, ForcingLevel, Seat, Vulnerability | 4h |
| 1.1.3 | Pydantic 資料模型 — bid | BidNode, BidMeaning, HandConstraint | 6h |
| 1.1.4 | Pydantic 資料模型 — convention | Convention, ConventionParameter | 4h |
| 1.1.5 | Pydantic 資料模型 — context | Context, OpponentPattern, ContextOverride | 4h |
| 1.1.6 | Pydantic 資料模型 — system | SystemMetadata, Definitions, BBDSLDocument | 4h |
| 1.1.7 | YAML Loader | 讀取 YAML → BBDSLDocument 實例 | 4h |
| 1.1.8 | JSON Schema 自動產生 | 從 Pydantic 模型產生 JSON Schema | 2h |
| 1.1.9 | 精準制範例 YAML | examples/precision.bbdsl.yaml（可載入通過驗證） | 6h |
| 1.1.10 | 單元測試：模型載入 | 10+ test cases | 4h |

**Sprint 1.1 交付物**：`bbdsl load precision.bbdsl.yaml` 可成功載入並印出制度摘要

#### 關鍵設計決策

**Pydantic 模型範例**（`models/bid.py`）：
```python
from pydantic import BaseModel, Field
from typing import Optional, Union
from .common import I18nString, Range, ForcingLevel

class HandConstraint(BaseModel):
    """標準手牌約束（核心 Schema，不含匯入過渡欄位 — 見 ADR-4）"""
    hcp: Optional[Range] = None
    controls: Optional[Range] = None
    losing_tricks: Optional[Range] = None
    clubs: Optional[Range] = None
    diamonds: Optional[Range] = None
    hearts: Optional[Range] = None
    spades: Optional[Range] = None
    shape: Optional[Union[str, dict]] = None  # "any" | {"ref": "balanced"}
    suit_quality: Optional[dict] = None
    stopper_in: Optional[str] = None
    specific_cards: Optional[list[str]] = None
    conditions: Optional[list[dict]] = None

class BidMeaning(BaseModel):
    description: Optional[I18nString] = None
    hand: Optional[HandConstraint] = None
    artificial: bool = False
    alertable: bool = False
    preemptive: bool = False
    forcing: Optional[ForcingLevel] = None
    transfer_to: Optional[str] = None
    notes: Optional[I18nString] = None

class BidNode(BaseModel):
    bid: Optional[str] = None
    id: Optional[str] = None
    by: Optional[str] = None  # opener|responder|overcaller|advancer
    ref: Optional[str] = None
    foreach_suit: Optional[dict] = None
    meaning: Optional[BidMeaning] = None
    priority: Optional[int] = Field(None, ge=0, le=1000)
    context_overrides: Optional[list] = None
    conventions_applied: Optional[list] = None
    responses: Optional[list] = None  # BidNode[] | OpponentBranch[]
    continuations: Optional[list] = None
    when: Optional[str] = None
```

**OpponentPattern 模型**（`models/context.py`）：
```python
class OpponentPattern(BaseModel):
    """對手行為模式 — 純資料結構，匹配邏輯在 core/opponent_matcher.py（見 ADR-5）"""
    # 簡單形式（字串：pass, double, any_action, any_bid）
    simple: Optional[str] = None
    # 具體叫品
    bid: Optional[str] = None
    # 叫品範圍
    bid_range: Optional[tuple[str, str]] = None
    # 階層
    level: Optional[Union[int, Range, list[int]]] = None
    # 花色
    suit: Optional[str] = None  # C/D/H/S/major/minor
    # 抽象分類
    bid_type: Optional[str] = None
    # 組合
    any_of: Optional[list['OpponentPattern']] = None
    all_of: Optional[list['OpponentPattern']] = None
    not_: Optional['OpponentPattern'] = Field(None, alias='not')
```

---

### Sprint 1.2（第 3-4 週）：foreach_suit 展開器 + 驗證器

| # | 任務 | 產出 | 預估工時 |
|---|------|------|----------|
| 1.2.1 | 花色元資料表 | SUIT_META: M→{lower, zh-TW, en, symbol, rank, color, group, other, transfer_from} | 2h |
| 1.2.2 | 變數替換引擎 | `expand_template(template_str, variable, suit)` → 替換後字串 | 4h |
| 1.2.3 | foreach_suit 遞迴展開 | `expand_foreach(node, suit_groups)` → list[BidNode] | 6h |
| 1.2.4 | 展開器整合測試 | 1H/1S 對稱、Jacoby Transfer、弱二、三階先制 | 4h |
| 1.2.5 | 驗證器框架 | `Validator` 類別 + `ValidationResult` + `ValidationReport` | 4h |
| 1.2.6 | val-004 convention-ref-exists | 引用的 Convention 必須存在 | 2h |
| 1.2.7 | val-006 pattern-ref-exists | 引用的 pattern 必須存在 | 2h |
| 1.2.8 | val-008 alertable-check | 人工叫品必須標記 alertable | 2h |
| 1.2.9 | val-011 convention-id-format | namespace 格式正則檢查 | 1h |
| 1.2.10 | val-012 shape-format | shapes 用 '-', shapes_exact 用 '=' | 1h |
| 1.2.11 | val-002 no-overlap | 同層級叫品 HCP+牌型條件不重疊 | 6h |
| 1.2.12 | val-005 convention-conflicts | 互斥 Convention 不同時啟用 | 2h |
| 1.2.13 | val-007 forcing-consistency | forcing:game 序列一致性 | 4h |
| 1.2.14 | 驗證器整合測試 | valid + invalid 測試用例各 10+ | 4h |

**Sprint 1.2 交付物**：
```bash
$ bbdsl expand precision.bbdsl.yaml     # 展開 foreach_suit → expanded.json
$ bbdsl validate precision.bbdsl.yaml   # 執行 8 條規則 → 驗證報告
```

#### foreach_suit 展開器核心演算法

```python
SUIT_META = {
    "C": {"lower": "c", "zh-TW": "梅花", "en": "clubs", "symbol": "♣",
          "rank": 0, "color": "black", "group": "minor",
          "other": "D", "transfer_from": None},
    "D": {"lower": "d", "zh-TW": "方塊", "en": "diamonds", "symbol": "♦",
          "rank": 1, "color": "red", "group": "minor",
          "other": "C", "transfer_from": "C"},
    "H": {"lower": "h", "zh-TW": "紅心", "en": "hearts", "symbol": "♥",
          "rank": 2, "color": "red", "group": "major",
          "other": "S", "transfer_from": "D"},
    "S": {"lower": "s", "zh-TW": "黑桃", "en": "spades", "symbol": "♠",
          "rank": 3, "color": "black", "group": "major",
          "other": "H", "transfer_from": "H"},
}

SUIT_GROUPS = {
    "majors": ["H", "S"],
    "minors": ["C", "D"],
    "reds": ["H", "D"],
    "blacks": ["S", "C"],
    "all": ["C", "D", "H", "S"],
}

def expand_foreach(node: dict, definitions: dict) -> list[dict]:
    """展開 foreach_suit 節點為多個具體節點"""
    fs = node.get("foreach_suit")
    if not fs:
        return [node]

    variable = fs["variable"]
    group_name = fs["over"]
    suits = definitions.get("suit_groups", SUIT_GROUPS).get(group_name, [])

    expanded = []
    for suit in suits:
        # 深拷貝節點，移除 foreach_suit
        new_node = deep_copy_without(node, "foreach_suit")
        # 替換所有 ${variable} 及衍生屬性
        new_node = replace_variables(new_node, variable, suit)
        # 標記展開來源
        new_node["_expanded_from"] = {"foreach_suit": variable, "value": suit}
        # 遞迴展開巢狀
        if "responses" in new_node:
            new_node["responses"] = expand_responses(new_node["responses"], definitions)
        expanded.append(new_node)

    return expanded
```

---

### Sprint 1.3（第 5-6 週）：BML 匯入器 MVP + CLI

| # | 任務 | 產出 | 預估工時 |
|---|------|------|----------|
| 1.3.1 | BML 解析器 — 縮排叫牌樹 | `parse_bml_tree(text) → list[BMLNode]` | 8h |
| 1.3.2 | BML 語義提取 — HCP 模式 | 正則：`(\d+)-(\d+)` → `hcp: {min, max}` | 2h |
| 1.3.3 | BML 語義提取 — 牌型關鍵字 | bal → balanced, semi-bal → semi_balanced | 2h |
| 1.3.4 | BML 語義提取 — 花色長度 | `5+!h` → `hearts: {min: 5}` | 2h |
| 1.3.5 | BML 語義提取 — forcing 關鍵字 | GF, INV, NF, signoff | 1h |
| 1.3.6 | BML 語義提取 — 人工/alert 關鍵字 | artificial, transfer, relay, puppet | 1h |
| 1.3.7 | BML → BBDSL 轉換器 | `bml_to_bbdsl(bml_nodes) → BBDSLDocument` | 6h |
| 1.3.8 | UnresolvedNode 產生（ADR-4） | `is_unresolved: true` + `bml_original` + `reason` + TODO 清單 | 2h |
| 1.3.9 | BML 匯入測試 | 用 SAYC BML 範例測試 | 4h |
| 1.3.10 | CLI — main.py | `bbdsl load/expand/validate/import` 四個子命令 | 4h |
| 1.3.11 | CLI — 彩色輸出 | 驗證報告的 error/warning/info 顏色區分 | 2h |
| 1.3.12 | 端到端測試 | 完整流程：BML → import → expand → validate | 4h |
| 1.3.13 | README + Getting Started | 安裝、快速開始、CLI 用法 | 3h |

**Sprint 1.3 交付物**：
```bash
$ bbdsl import bml sayc.bml -o sayc.bbdsl.yaml   # BML 匯入
$ bbdsl validate sayc.bbdsl.yaml                   # 驗證
# 輸出：
# ✅ val-004 convention-ref-exists: PASSED
# ✅ val-006 pattern-ref-exists: PASSED
# ⚠️ val-002 no-overlap: 2 warnings (1H/1S HCP overlap at 11-15)
# ❌ val-008 alertable-check: 1 error (2D transfer not marked alertable)
# 📋 BML import: 3 UnresolvedNode（見 ADR-4，需手動修復後才能匯出）
```

#### BML 匯入器核心演算法

```python
import re

# HCP 模式
HCP_PATTERN = re.compile(r'(\d+)\s*[-–]\s*(\d+)')
# 花色長度模式：5+!h, 4+!s, 6♥ 等
SUIT_LENGTH_PATTERN = re.compile(
    r'(\d+)\+?\s*[!]?\s*([shdc♠♥♦♣])',
    re.IGNORECASE
)
# forcing 關鍵字
FORCING_MAP = {
    'gf': 'game', 'game force': 'game', 'game forcing': 'game',
    'inv': 'invitational', 'invitational': 'invitational',
    'nf': 'none', 'non-forcing': 'none', 'n/f': 'none',
    'sign-off': 'signoff', 'signoff': 'signoff', 'sign off': 'signoff',
    'forcing': 'one_round',
}
SUIT_CHAR_MAP = {
    's': 'spades', '♠': 'spades',
    'h': 'hearts', '♥': 'hearts',
    'd': 'diamonds', '♦': 'diamonds',
    'c': 'clubs', '♣': 'clubs',
}
ARTIFICIAL_KEYWORDS = {'artificial', 'art', 'relay', 'puppet', 'transfer', 'asking'}
SHAPE_KEYWORDS = {'bal': 'balanced', 'balanced': 'balanced', 'semi-bal': 'semi_balanced'}

def extract_semantics(description: str) -> CallNode | UnresolvedNode:
    """從 BML 自由文字描述中提取結構化語義（ADR-4: 分層設計）"""
    hand = {}
    forcing = None
    artificial = False
    desc_lower = description.lower().strip()

    # 1. HCP
    hcp_match = HCP_PATTERN.search(description)
    if hcp_match:
        hand["hcp"] = {"min": int(hcp_match.group(1)), "max": int(hcp_match.group(2))}
    elif (m := re.search(r'(\d+)\+', description)):
        hand["hcp"] = {"min": int(m.group(1))}

    # 2. 花色長度
    for match in SUIT_LENGTH_PATTERN.finditer(description):
        length = int(match.group(1))
        suit = SUIT_CHAR_MAP.get(match.group(2).lower())
        if suit:
            hand[suit] = {"min": length}

    # 3. 牌型
    for keyword, ref in SHAPE_KEYWORDS.items():
        if keyword in desc_lower:
            hand["shape"] = {"ref": ref}
            break

    # 4. forcing
    for keyword, level in FORCING_MAP.items():
        if keyword in desc_lower:
            forcing = level
            break

    # 5. 人工/alert
    for kw in ARTIFICIAL_KEYWORDS:
        if kw in desc_lower:
            artificial = True
            break

    # 6. 如果 hand 仍為空 → 退化為 UnresolvedNode
    if not hand:
        return UnresolvedNode(
            bml_original=description,
            reason="無法從描述文字中提取手牌約束"
        )

    return CallNode(call="...", condition=str(hand), meaning=description)
```

---

### Phase 1 完成標準

| 驗收項目 | 標準 |
|----------|------|
| 精準制範例載入 | `bbdsl load precision.bbdsl.yaml` 成功，無 Pydantic 錯誤 |
| foreach_suit 展開 | 1H/1S 對稱、弱二 H/S、三階 C/D/H/S 正確展開 |
| 驗證器 8 規則 | valid/ 全部 PASS，invalid/ 全部偵測到預期的錯誤 |
| BML 匯入 | SAYC BML → BBDSL YAML，HCP/花色長度正確提取率 > 80% |
| CLI 四個指令 | load / expand / validate / import 均可執行 |
| 測試覆蓋率 | > 80% |

---

## Phase 2: 實戰價值（6 → 12 週）

### 🎯 里程碑目標
> **用 BBDSL 寫完一個制度後，可以自動產生 BBOalert 規則直接用於 BBO 線上對打，
> 也可以匯出 BML 文件用於教學出版。**

### Sprint 2.1（第 7-8 週）：BBOalert 匯出器 + 匯入器

| # | 任務 | 預估工時 |
|---|------|----------|
| 2.1.1 | BBOalert 格式解析器（regex/wildcard/context 語法） | 6h |
| 2.1.2 | BBDSL → BBOalert 序列扁平化（叫牌樹 → 所有路徑列舉） | 8h |
| 2.1.3 | BBOalert 匯出器：序列 → 說明映射 | 6h |
| 2.1.4 | BBOalert 匯出：座位/身價條件處理 | 4h |
| 2.1.5 | BBOalert 匯出：Convention ref 展開為完整序列 | 4h |
| 2.1.6 | BBOalert 匯入器（反向：序列映射 → 叫牌樹） | 8h |
| 2.1.7 | 測試：匯出後再匯入，round-trip 比對 | 4h |

**交付物**：
```bash
$ bbdsl export bboalert precision.bbdsl.yaml -o precision.bboalert
# 產生可直接貼入 BBOalert 擴充套件的規則檔

$ bbdsl import bboalert my_rules.bboalert -o my_system.bbdsl.yaml
```

### Sprint 2.2（第 9-10 週）：BML 匯出器 + selection_rules 引擎

| # | 任務 | 預估工時 |
|---|------|----------|
| 2.2.1 | BML 匯出器：BBDSL 叫牌樹 → BML 縮排格式 | 6h |
| 2.2.2 | BML 匯出：i18n 語系選擇 | 2h |
| 2.2.3 | BML 匯出：花色符號（♠♥♦♣）處理 | 1h |
| 2.2.4 | BML 匯出：Convention 內嵌 vs 引用 | 3h |
| 2.2.5 | selection_rules 條件解析器（Dealer-compatible 表達式） | 8h |
| 2.2.6 | selection_rules 執行引擎 | 6h |
| 2.2.7 | selection_rules 驗證：val-013 priority-unique, val-014 exhaustive | 4h |
| 2.2.8 | 測試：精準制 selection_rules 對各種手牌的選擇 | 4h |

### Sprint 2.3（第 11-12 週）：SAYC + 2/1 GF 範例 + 驗證器完整化

| # | 任務 | 預估工時 |
|---|------|----------|
| 2.3.1 | SAYC 完整制度 YAML（含所有 Convention） | 8h |
| 2.3.2 | 2/1 Game Forcing 完整制度 YAML | 8h |
| 2.3.3 | 驗證器補完：val-001 hcp-coverage | 6h |
| 2.3.4 | 驗證器補完：val-003 response-complete | 4h |
| 2.3.5 | 驗證器補完：val-009 seat-vul-no-conflict | 3h |
| 2.3.6 | 驗證器補完：val-010 foreach-expansion | 3h |
| 2.3.7 | 全部 14 條驗證規則整合測試 | 6h |
| 2.3.8 | CLI 擴充：`bbdsl export bml/bboalert` | 2h |

### Phase 2 完成標準

| 驗收項目 | 標準 |
|----------|------|
| BBOalert 匯出 | 精準制 → BBOalert，在 BBO 上載入後 alert 正確 |
| BBOalert round-trip | export → import → export，結果一致 |
| BML 匯出 | 精準制 → BML → HTML，可讀且完整 |
| 三個範例制度 | Precision + SAYC + 2/1 GF 全部通過 14 條驗證 |
| selection_rules | 給定 100 手測試牌，精準制選擇正確率 > 95% |

---

## Phase 3: 視覺化與教學（12 → 18 週）

### 🎯 里程碑目標
> **教練可以用 BBDSL 產生互動式網頁叫牌樹、WBF 約定卡、
> 以及自動產生的練習題給學生練習。**

### Sprint 3.1（第 13-14 週）：互動式 HTML Viewer

| # | 任務 | 預估工時 |
|---|------|----------|
| 3.1.1 | HTML 模板設計（Jinja2 + Tailwind CSS） | 6h |
| 3.1.2 | 叫牌樹摺疊/展開互動 | 4h |
| 3.1.3 | 叫牌方顏色標示（opener=藍, responder=綠, opponent=紅） | 2h |
| 3.1.4 | Hover 顯示完整序列路徑 + 手牌約束摘要 | 4h |
| 3.1.5 | 情境切換器（座位/身價 dropdown → context_overrides 切換） | 6h |
| 3.1.6 | 搜尋功能（輸入叫品序列 → 高亮路徑） | 4h |
| 3.1.7 | Convention 模組獨立區塊 + 展開/摺疊 | 3h |
| 3.1.8 | 響應式設計（桌面 + 手機） | 3h |

### Sprint 3.2（第 15-16 週）：Convention Card + SVG 叫牌樹

| # | 任務 | 預估工時 |
|---|------|----------|
| 3.2.1 | WBF Convention Card 模板研究 + 欄位映射 | 4h |
| 3.2.2 | BBDSL → WBF Convention Card PDF 產生器 | 8h |
| 3.2.3 | ACBL Convention Card 變體支援 | 4h |
| 3.2.4 | SVG 叫牌樹產生器（D3.js tree layout） | 8h |
| 3.2.5 | SVG 匯出（靜態圖 + 可嵌入 HTML） | 3h |

### Sprint 3.3（第 17-18 週）：練習題產生器 + 教學模式

| # | 任務 | 預估工時 |
|---|------|----------|
| 3.3.1 | 隨機手牌產生器（符合 BBDSL hand constraint） | 6h |
| 3.3.2 | 練習題格式定義 | 2h |
| 3.3.3 | 開叫練習題產生器（給手牌 → 問開叫什麼） | 4h |
| 3.3.4 | 回應練習題產生器（給序列+手牌 → 問回應什麼） | 6h |
| 3.3.5 | 練習題 HTML 互動介面 | 6h |
| 3.3.6 | 教學模式：逐步揭露（先看手牌→猜叫品→看解說） | 4h |
| 3.3.7 | 教學模式：多選題 + 即時回饋 | 4h |

### Phase 3 完成標準

| 驗收項目 | 標準 |
|----------|------|
| HTML Viewer | 精準制完整呈現，可摺疊、搜尋、情境切換 |
| Convention Card | WBF 格式 PDF，填寫正確率 > 90% |
| SVG 叫牌樹 | 開叫 + 回應樹完整呈現，可嵌入 HTML |
| 練習題 | 產生 50+ 題，每題有正確答案和解說 |

---

## Phase 4: AI 整合與模擬（18 → 24 週）

### 🎯 里程碑目標
> **AI 可以載入 BBDSL 制度知識庫進行對練，Dealer 可以產生符合條件的練習牌，
> 兩個制度可以自動比較差異。**

### Sprint 4.1（第 19-20 週）：AI 知識庫匯出 + Dealer 橋接

| # | 任務 | 預估工時 |
|---|------|----------|
| 4.1.1 | AI KB JSON 匯出：叫牌序列扁平化 | 6h |
| 4.1.2 | AI KB JSON 匯出：自然語言描述產生 | 4h |
| 4.1.3 | AI KB JSONL 匯出（每行一條規則，RAG 友善） | 3h |
| 4.1.4 | BBDSL hand constraint → Dealer script 條件 | 6h |
| 4.1.5 | Dealer script 條件 → BBDSL hand constraint | 6h |
| 4.1.6 | 整合測試：Dealer 產生的手牌 vs BBDSL 選擇 | 4h |

### Sprint 4.2（第 21-22 週）：模擬對練引擎

| # | 任務 | 預估工時 |
|---|------|----------|
| 4.2.1 | 手牌產生器（Dealer 橋接或內建） | 4h |
| 4.2.2 | 叫牌決策引擎（BBDSL → 給定手牌+序列 → 最佳叫品） | 8h |
| 4.2.3 | 四家模擬框架（N/S 用一個制度，E/W 用另一個或 Pass） | 6h |
| 4.2.4 | 模擬結果記錄（完整叫牌序列 + 各步決策依據） | 4h |
| 4.2.5 | CLI: `bbdsl simulate --system precision --deals 100` | 3h |

### Sprint 4.3（第 23-24 週）：制度比較器 + PBN 匯出

| # | 任務 | 預估工時 |
|---|------|----------|
| 4.3.1 | 制度比較引擎：給定手牌，兩個制度的叫牌差異 | 6h |
| 4.3.2 | 比較報告產生（差異矩陣、衝突案例） | 4h |
| 4.3.3 | PBN 匯出：在 [Note] 中嵌入 BBDSL 語義 | 4h |
| 4.3.4 | PBN 匯出：模擬結果 → PBN 牌譜 | 4h |
| 4.3.5 | CLI: `bbdsl compare precision.yaml sayc.yaml --deals 50` | 3h |

### Phase 4 完成標準

| 驗收項目 | 標準 |
|----------|------|
| AI KB 匯出 | JSONL 格式，每條規則含完整路徑+NL 描述，可被 LLM 載入 |
| Dealer 橋接 | BBDSL → Dealer 條件，產生的手牌 100% 符合 BBDSL 約束 |
| 模擬引擎 | 100 副模擬牌，精準制叫牌序列合理 |
| 制度比較 | Precision vs SAYC，差異報告含具體手牌範例 |
| PBN 匯出 | 含嵌入語義的 PBN，可被 HandViewer 正常顯示 |

---

## Phase 5: 社群平台（24 → 32 週）— 獨立 Repo（ADR-7）

> **⚠️ Phase 5 將獨立為另一個 repo**（全端 Web 專案：FastAPI + React + PostgreSQL），
> 本 repo 專注於 Phase 1-4 的 Python CLI 工具鏈。Phase 5 repo 以 `bbdsl` 套件為核心依賴。

### 🎯 里程碑目標
> **橋牌社群可以在線上搜尋/分享/組合 Convention 模組，
> 用線上編輯器撰寫 BBDSL，並看到即時預覽和驗證結果。**

### Sprint 5.1（第 25-27 週）：Convention Registry

| # | 任務 | 預估工時 |
|---|------|----------|
| 5.1.1 | Registry API 設計（REST + OpenAPI spec） | 4h |
| 5.1.2 | Registry 後端（FastAPI + SQLite/PostgreSQL） | 12h |
| 5.1.3 | Convention 上傳 + 自動驗證 | 6h |
| 5.1.4 | Convention 搜尋（by tag, category, name） | 4h |
| 5.1.5 | Convention 版本管理（SemVer） | 4h |
| 5.1.6 | Namespace 註冊 + 權限管理 | 6h |
| 5.1.7 | CLI: `bbdsl registry publish/search/install` | 4h |

### Sprint 5.2（第 28-30 週）：線上編輯器

| # | 任務 | 預估工時 |
|---|------|----------|
| 5.2.1 | 前端框架（React + Monaco Editor for YAML） | 8h |
| 5.2.2 | 即時 YAML 語法高亮 + 錯誤提示 | 6h |
| 5.2.3 | 即時驗證（WebSocket → 後端驗證器） | 6h |
| 5.2.4 | 即時預覽（叫牌樹 HTML Viewer 同步） | 6h |
| 5.2.5 | Convention 模組瀏覽 + 一鍵插入 | 4h |
| 5.2.6 | 匯出按鈕（BBOalert / BML / PDF） | 3h |
| 5.2.7 | 分享功能（永久連結 + 嵌入碼） | 3h |

### Sprint 5.3（第 31-32 週）：Diff/Merge + 社群功能

| # | 任務 | 預估工時 |
|---|------|----------|
| 5.3.1 | 制度 diff 引擎（結構化比較，非文字 diff） | 8h |
| 5.3.2 | Diff 視覺化（左右對照 + 差異高亮） | 6h |
| 5.3.3 | Merge 工具（合併兩個制度的差異） | 6h |
| 5.3.4 | 使用者帳號 + OAuth（GitHub/Google） | 6h |
| 5.3.5 | Convention 評分 + 留言 | 4h |
| 5.3.6 | 推薦系統（基於使用的 Convention 推薦相關模組） | 4h |
| 5.3.7 | LIN 教學整合（嵌入 HandViewer） | 4h |

### Phase 5 完成標準

| 驗收項目 | 標準 |
|----------|------|
| Registry | 10+ Convention 模組已上傳，搜尋/安裝/發布可用 |
| 線上編輯器 | 即時驗證 < 500ms，預覽同步 < 1s |
| Diff/Merge | 精準制 vs 我的精準制 diff 正確顯示差異 |
| 社群功能 | 5+ 使用者註冊，Convention 可評分留言 |

---

## 風險與緩解

| 風險 | 影響 | 機率 | 緩解策略 |
|------|------|------|----------|
| BML 格式有未文件化的邊界案例 | 匯入器不完整 | 高 | 先支援 80% 常見語法，邊界案例退化為 UnresolvedNode（ADR-4）；基於 10 份公開 BML 樣本測試（ADR-6） |
| BBOalert 格式變化 | 匯出器不相容 | 中 | 版本化匯出，支援多版本格式 |
| 橋牌社群對 YAML 的接受度 | 採用率低 | 中 | 強調 BML 匯入 + BBOalert 匯出的即時價值 |
| 叫牌選擇的語義複雜度 | selection_rules 不夠表達 | 中 | Phase 2 先用 priority，selection_rules 漸進增強 |
| 單人開發瓶頸 | 進度延遲 | 高 | Phase 1 先產出可用 MVP，Phase 2+ 可邀請社群貢獻 |

---

## 成功指標（6 個月後）

| 指標 | 目標 |
|------|------|
| 範例制度數 | ≥ 3 個完整制度（Precision, SAYC, 2/1 GF） |
| Convention 模組數 | ≥ 10 個獨立模組 |
| CLI 指令數 | ≥ 8 個（load, expand, validate, import, export, simulate, compare, registry） |
| 驗證規則數 | 14 條全部實作 |
| 測試覆蓋率 | > 85% |
| BML 匯入準確率 | > 80% HCP/花色長度自動提取 |
| BBOalert 匯出可用性 | 在 BBO 上實測可用 |
| GitHub stars | ≥ 50（橋牌+技術跨界社群） |
