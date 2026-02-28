# BBDSL — Bridge Bidding Description Specification Language

> 結構化、可驗證、AI 可讀的橋牌叫牌制度描述語言

[![License: MIT](https://img.shields.io/badge/Code-MIT-green.svg)](LICENSE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/Conventions-CC_BY--SA_4.0-blue.svg)](LICENSE-CC-BY-SA-4.0)
[![Spec Version](https://img.shields.io/badge/spec-v0.3--draft-blue)]()

## 為什麼需要 BBDSL？

現有橋牌叫牌格式各有侷限：

| 格式 | 能做什麼 | 缺什麼 |
|------|----------|--------|
| **BML** | 描述「叫什麼」，產出教學文件 | 無法驗證矛盾、無結構化語義 |
| **BBOalert** | 線上對打的 Alert 說明 | 序列→文字映射，無法推理邏輯 |
| **Dealer** | 發牌模擬條件篩選 | 只有牌型條件，無叫牌流程 |
| **PBN** | 牌譜記錄與交換 | 記錄「發生了什麼」而非「應該怎麼叫」 |

**BBDSL 填補語義空白** — 以 YAML 定義叫牌制度的完整語義，讓機器能驗證邏輯一致性，讓 AI 能「理解」而非僅「複述」制度。

## 生態系定位

```
                    ┌─────────────────────────────────────┐
                    │         BBDSL (知識庫核心)            │
                    │  結構化語義 · 可驗證 · AI 可讀        │
                    └──────────┬──────────────┬────────────┘
           ┌───────────────────┼──────────────┼───────────────────┐
           ▼                   ▼              ▼                   ▼
    ┌─────────────┐  ┌──────────────┐ ┌─────────────┐  ┌──────────────┐
    │   BBOalert  │  │  BML → HTML  │ │ Convention  │  │ AI Knowledge │
    │  (線上對打)  │  │  /LaTeX/PDF  │ │    Card     │  │    Base      │
    │  自動 Alert  │  │  (教學出版)   │ │ (WBF/ACBL) │  │ (RAG/Bot)   │
    └─────────────┘  └──────────────┘ └─────────────┘  └──────────────┘

     匯入層                                                    ▼
    ┌─────────────┐                                   ┌──────────────┐
    │ BML → BBDSL │                                   │    Dealer     │
    │  BBOalert →  │                                   │  (發牌模擬)   │
    └─────────────┘                                   └──────────────┘
```

## 快速一覽

```yaml
bbdsl: "0.3"

system:
  name:
    zh-TW: "精準制"
    en: "Precision Club"
  version: "2.0.0"
  authors:
    - name: "C.C. Wei"
  description:
    zh-TW: "經典精準制，強梅花開叫，配合現代特約"
    en: "Classic Precision Club with modern conventions"
  locale: "zh-TW"
  license: "CC-BY-SA-4.0"

definitions:
  strength_methods:
    hcp:
      description: { zh-TW: "大牌點 (A=4, K=3, Q=2, J=1)", en: "High Card Points" }
      range: [0, 37]
  patterns:
    balanced:
      description: { zh-TW: "平均牌型", en: "Balanced" }
      shapes: ["4-3-3-3", "4-4-3-2", "5-3-3-2"]

conventions:
  stayman:
    id: "bbdsl/stayman-v1"
    name: { zh-TW: "史泰曼", en: "Stayman" }
    trigger: { after: ["1NT"], bid: "2C" }
    responses:
      - bid: "2D"
        meaning:
          description: { zh-TW: "無四張高花", en: "No 4-card major" }
      - bid: "2H"
        meaning:
          description: { zh-TW: "四張紅心", en: "4+ hearts" }
          hand: { hearts: { min: 4 } }

openings:
  - bid: "1C"
    meaning:
      description: { zh-TW: "16+ HCP，人工強梅花", en: "16+ HCP, artificial strong club" }
      hand:
        hcp: { min: 16 }
      artificial: true
      alertable: true
      forcing: one_round
```

## 核心特性

### 結構化語義

- **牌力條件**：HCP、控制、失墩、總點力，範圍式約束
- **牌型描述**：通用形式 (`4-3-3-3`) 與精確形式 (`4=4=1=4`)、萬用字元 (`*`)
- **叫品語義**：forcing level、人工/自然、轉換叫、示叫、alertable
- **Dealer 相容**：`hand constraint` 語法對應 Dealer script 函數 (hcp, shape, losers, top, hascard...)

### 情境感知

- **座位**：1st / 2nd / 3rd / 4th 不同開叫策略
- **身價**：None / Favorable / Unfavorable / Both 調整叫牌激進度
- **對手行為**：9 種模式語法 — 具體叫品、範圍、類型 (overcall/preempt/double...)、邏輯組合

### 模組化特約

- 獨立 `.bbdsl-conv.yaml` 檔案，支援參數化
- Namespace registry（`bbdsl/stayman-v1`、`chris/precision-relay-v2`）
- 衝突偵測（`conflicts_with`）、依賴宣告（`requires`、`recommends`）

### 機器可驗證

14 條驗證規則：HCP 覆蓋完整性、叫品重疊偵測、Convention 引用完整性、forcing 一致性、foreach 展開衝突檢測等。

### AI-First 設計

- JSON 中間格式天然適合 LLM RAG
- `ai_knowledge_base` 匯出格式：扁平化序列 + 自然語言描述
- 結構化語義讓 AI 能理解叫牌邏輯而非只記住叫品

## 規格文件

| 文件 | 說明 |
|------|------|
| [BBDSL-SPEC-v0.3.md](BBDSL-SPEC-v0.3.md) | 核心規格書 — schema 定義、手牌條件、對手模式語言、驗證規則 |
| [BBDSL-SUPPLEMENT-v0.3.md](BBDSL-SUPPLEMENT-v0.3.md) | 設計補充 — 選擇引擎、PBN/BSS/LIN 整合、BML 匯入映射 |
| [BBDSL_IMPLEMENTATION-PLAN.md](BBDSL_IMPLEMENTATION-PLAN.md) | 實作計畫 — 5 階段路線圖、技術架構、Sprint 細分 |
| [bbdsl-schema-v0.3.json](bbdsl-schema-v0.3.json) | JSON Schema (draft-07) |

## 實作路線圖

```
Phase 1 (0-6 週)     Phase 2 (6-12 週)     Phase 3 (12-18 週)    Phase 4 (18-24 週)    Phase 5 (24-32 週)
Schema + MVP         實戰價值               視覺化 + 教學          AI 整合               社群平台
─────────────────────────────────────────────────────────────────────────────────────────────────
Pydantic 模型        BBOalert 匯出/匯入     HTML 互動 Viewer      AI KB 匯出            Convention Registry
foreach_suit 展開器  BML 匯出              Convention Card 產生   Dealer 雙向轉換        線上編輯器
驗證器 (8 規則)      選擇引擎               SVG 叫牌樹            模擬對練引擎           Diff / Merge
BML 匯入 MVP         SAYC + 2/1 GF 範例    練習題產生器           制度比較器             社群評分
精準制範例            完整 14 條驗證規則      教學模式              PBN 匯出              LIN 整合
```

**技術基礎**：Python 3.11+、Pydantic v2、ruamel.yaml、Click CLI、pytest + hypothesis、uv 套件管理

## 專案結構

```
bbdsl/
├── BBDSL-SPEC-v0.3.md            # 核心規格書
├── BBDSL-SUPPLEMENT-v0.3.md      # 設計補充
├── BBDSL_IMPLEMENTATION-PLAN.md  # 實作計畫
├── bbdsl-schema-v0.3.json        # JSON Schema
├── process/
│   └── 1-discover/               # 探索階段產出（競品分析、調查報告、範例 YAML）
└── prompts/                      # AI 輔助工作流程提示詞
```

## 範例制度

- **SAYC** (Standard American Yellow Card)：[process/1-discover/sayc.bbdsl.yaml](process/1-discover/sayc.bbdsl.yaml)

## 設計原則

1. **模組化** — Convention 獨立定義，支援 namespace、版本化、參數化
2. **繼承性** — 制度 `base` 繼承 + 節點 `context_overrides` 差異化表達
3. **可驗證性** — 14 條規則涵蓋結構、引用、語義、情境一致性
4. **情境感知** — 座位、身價、對手行為完整建模
5. **對稱語法糖** — `foreach_suit` 寫時展開，減少重複定義
6. **生態相容** — Dealer 語法相容、BML/BBOalert 雙向匯入匯出
7. **漸進式定義** — `completeness` 欄位支援從草稿逐步精煉至完整
8. **AI-First** — 結構化語義天然適合 LLM RAG 與知識庫建構

## 授權

本專案採用**雙軌授權**（詳見 [LICENSING.md](LICENSING.md)）：

- **程式碼**：[MIT License](LICENSE)
- **叫牌特約檔案**（`registry/`、`examples/conventions/`）：[CC-BY-SA-4.0](LICENSE-CC-BY-SA-4.0)
