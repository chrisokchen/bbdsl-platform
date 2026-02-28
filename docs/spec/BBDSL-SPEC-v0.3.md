# BBDSL v0.3.0-draft — 精煉規格書
# Bridge Bidding Description Specification Language
# 整合來源：v0.2 schema + 競品調查 + deep-research-report + usedDSLs_gemini 分析

---

## 版本演進

| 版本 | 焦點 |
|------|------|
| v0.1 | 概念驗證：YAML 可以描述叫牌制度 |
| v0.2 | 情境感知：座位/身價/對手行為 + foreach_suit + Convention 參數化 |
| v0.3 | **生態整合**：Dealer 語法相容 + 完整對手模式語言 + Convention namespace + 轉換器介面 |

---

## 設計目標（v0.3 修訂）

1. **通用性**：能描述任意叫牌制度
2. **教學友善**：支援視覺化叫牌邏輯樹
3. **機器可驗證**：一致性檢查、遺漏偵測、衝突檢測
4. **AI 可讀**：作為 LLM RAG 知識庫和 AI bot 的制度輸入
5. **社群協作**：Convention 模組 registry（namespace 化）
6. **互通性**：匯出 BBOalert / BML / WBF Convention Card / PBN annotation
7. **情境感知**：座位、身價、對手行為作為一等公民
8. **🆕 生態相容**：hand constraint 語法相容 Dealer script；支援 BML 匯入

---

## 生態系定位圖

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
                                                              │
     匯入層                                                    ▼
    ┌─────────────┐                                   ┌──────────────┐
    │ BML → BBDSL │                                   │    Dealer     │
    │  (轉換器)    │                                   │  (發牌模擬)   │
    └─────────────┘                                   │  PBN 資料集   │
                                                      └──────────────┘
```

---

## Schema 規格 (v0.3)

### 頂層結構

```yaml
bbdsl: "0.3"

system:
  name:
    zh-TW: "精準制"
    en: "Precision Club"
  version: "2.0.0"
  authors:
    - name: "C.C. Wei"
    - name: "Chris"
      role: maintainer
  description:
    zh-TW: "經典精準制，強梅花開叫，配合現代特約"
    en: "Classic Precision Club with modern conventions"
  base: null                           # 可繼承其他制度 URI
  locale: "zh-TW"
  license: "CC-BY-SA-4.0"

  completeness:
    openings: complete
    responses_to_1c: complete
    responses_to_1nt: complete
    defensive: partial
    competitive: draft
    slam_bidding: todo

definitions:    { ... }                # 全域定義（詳見下文）
contexts:       { ... }                # 命名情境
conventions:    { ... }                # 特約模組庫
openings:       [ ... ]                # 開叫定義
defensive:      [ ... ]                # 防禦性叫牌
defense_to:     [ ... ]                # 🆕 對特定制度的防禦
validation:     { ... }                # 驗證規則
export:         { ... }                # 匯出設定
```

---

### definitions 區塊（v0.3 強化）

```yaml
definitions:

  # ─── 牌力評估 ───
  strength_methods:
    hcp:
      description: { zh-TW: "大牌點 (A=4, K=3, Q=2, J=1)", en: "High Card Points" }
      range: [0, 37]
    controls:
      description: { zh-TW: "控制 (A=2, K=1)", en: "Controls" }
      range: [0, 12]
    losing_tricks:
      description: { zh-TW: "失墩計算法", en: "Losing Trick Count" }
      range: [0, 12]
    total_points:
      description: { zh-TW: "總點力 (HCP + 分配點)", en: "Total Points" }
      range: [0, 40]

  # ─── 牌型模式 ───
  patterns:
    balanced:
      description: { zh-TW: "平均牌型", en: "Balanced" }
      # 通用形式：花色長度由大到小排列，不指定具體花色
      shapes: ["4-3-3-3", "4-4-3-2", "5-3-3-2"]

    semi_balanced:
      description: { zh-TW: "半平均牌型", en: "Semi-balanced" }
      shapes: ["5-4-2-2", "6-3-2-2"]

    # 🆕 精確形式：♠=♥=♦=♣ 順序
    precision_2d:
      description: { zh-TW: "精準制 2D 牌型", en: "Precision 2D shape" }
      shapes_exact: ["4=4=1=4", "4=4=0=5"]

    flannery:
      description: { zh-TW: "Flannery 牌型", en: "Flannery shape" }
      shapes_exact: ["4=5=*=*"]          # * 表示任意

  # 🆕 ─── Dealer 語法相容的手牌條件函數 ───
  # 參考 Hans van Staveren Dealer script 語法
  dealer_functions:
    description: |
      BBDSL 的 hand constraint 支援以下 Dealer-compatible 函數，
      讓熟悉 Dealer 的使用者可以直接使用類似語法。
    supported:
      - name: "shape"
        syntax: "shape(player, pattern)"
        bbdsl_equivalent: "hand.shape / hand.shapes_exact"
        example:
          dealer: "shape(north, any 4333 + any 4432)"
          bbdsl: "shape: { ref: 'balanced' }"

      - name: "hcp"
        syntax: "hcp(player)"
        bbdsl_equivalent: "hand.hcp"
        example:
          dealer: "hcp(north) >= 15 && hcp(north) <= 17"
          bbdsl: "hcp: { min: 15, max: 17 }"

      - name: "spades/hearts/diamonds/clubs"
        syntax: "spades(player)"
        bbdsl_equivalent: "hand.spades / hand.hearts / ..."
        example:
          dealer: "hearts(north) >= 5"
          bbdsl: "hearts: { min: 5 }"

      - name: "control"
        syntax: "control(player)"
        bbdsl_equivalent: "hand.controls"

      - name: "losers"
        syntax: "losers(player)"
        bbdsl_equivalent: "hand.losing_tricks"

      - name: "top"
        syntax: "top(n, suit)"
        bbdsl_equivalent: "hand.suit_quality.top_n_honors"
        example:
          dealer: "top3(north, hearts) >= 2"
          bbdsl: "suit_quality: { hearts: { top3_honors: { min: 2 } } }"

      - name: "hascard"
        syntax: "hascard(player, card)"
        bbdsl_equivalent: "hand.specific_cards"
        example:
          dealer: "hascard(north, AS)"
          bbdsl: "specific_cards: ['AS']"

  # ─── 牌套品質 ───
  suit_qualities:
    good:
      description: { zh-TW: "好套：前三張大牌有兩張", en: "Good: 2 of top 3" }
      top3_honors: { min: 2 }
    strong:
      description: { zh-TW: "強套：前三張大牌有兩張且 6+", en: "Strong: 2 of top 3, 6+" }
      top3_honors: { min: 2 }
      min_length: 6
    weak:
      description: { zh-TW: "弱套：無大牌", en: "Weak: no top honors" }
      top3_honors: { max: 0 }

  # ─── 花色群組 ───
  suit_groups:
    majors: ["H", "S"]
    minors: ["C", "D"]
    reds: ["H", "D"]
    blacks: ["S", "C"]
    all: ["C", "D", "H", "S"]

  # 🆕 ─── 抽象叫品語義 (Bid Semantics) ───
  bid_semantics:
    cue_bid:
      resolve: "bid opponent's last-bid suit at cheapest level"
      description: { zh-TW: "叫對方花色", en: "Cue bid opponent's suit" }
    new_suit:
      resolve: "bid any unbid suit at cheapest level"
      description: { zh-TW: "叫新花", en: "New suit" }
    raise:
      resolve: "bid partner's suit at next level"
      description: { zh-TW: "加叫搭檔花色", en: "Raise partner's suit" }
    jump_raise:
      resolve: "bid partner's suit skipping one level"
      description: { zh-TW: "跳叫加叫", en: "Jump raise" }
    cheapest_bid:
      resolve: "lowest legal bid"
      description: { zh-TW: "最低合法叫品", en: "Cheapest bid" }
    fourth_suit:
      resolve: "bid the only unbid suit"
      description: { zh-TW: "第四花色", en: "Fourth suit" }
    systems_on:
      resolve: "all conventions remain active"
      description: { zh-TW: "制度照常", en: "Systems on" }
```

---

### 🆕 對手行為模式語言 (Opponent Action Pattern) — 完整規格

```yaml
# ══════════════════════════════════════════
# when_opponent 的完整語法
# ══════════════════════════════════════════

# ── 1. 簡單形式（向後相容 v0.2）──
when_opponent: pass
when_opponent: double

# ── 2. 具體叫品 ──
when_opponent:
  bid: "2H"                          # 對手叫了恰好 2H

# ── 3. 叫品範圍 ──
when_opponent:
  bid_range: ["1H", "2S"]           # 1H ~ 2S 之間任何叫品

# ── 4. 階層過濾 ──
when_opponent:
  level: 1                           # 一階
when_opponent:
  level: { min: 2, max: 3 }         # 二階或三階

# ── 5. 花色過濾 ──
when_opponent:
  suit: major                        # 叫了任何高花
when_opponent:
  suit: "H"                          # 叫了紅心（任何階層）
when_opponent:
  suit: minor                        # 叫了任何低花

# ── 6. 抽象叫品分類 (bid_type) ──
when_opponent:
  bid_type: simple_overcall          # 一般蓋叫（非跳叫）
when_opponent:
  bid_type: jump_overcall            # 跳叫蓋叫
when_opponent:
  bid_type: preempt                  # 先制叫
when_opponent:
  bid_type: cue_bid                  # 叫我方花色
when_opponent:
  bid_type: nt_overcall              # NT 蓋叫
when_opponent:
  bid_type: takeout_double           # 技術性賭倍
when_opponent:
  bid_type: artificial               # 人工叫品 (Michaels, Unusual 2NT, DONT...)

# ── 7. 組合條件 ──
when_opponent:
  all_of:                            # AND
    - bid_type: simple_overcall
    - level: { max: 2 }
when_opponent:
  any_of:                            # OR
    - bid_type: jump_overcall
    - bid_type: preempt

# ── 8. 否定條件 ──
when_opponent:
  not:
    bid_type: artificial             # 非人工叫品

# ── 9. 萬用字元 ──
when_opponent: any_action            # 任何行為（含 pass）
when_opponent: any_bid               # 任何叫品（不含 pass）
```

#### bid_type 完整枚舉

```yaml
bid_type_enum:
  pass:              { zh-TW: "不叫", en: "Pass" }
  simple_overcall:   { zh-TW: "一般蓋叫", en: "Simple overcall" }
  jump_overcall:     { zh-TW: "跳叫蓋叫", en: "Jump overcall" }
  preempt:           { zh-TW: "先制叫", en: "Preemptive bid" }
  cue_bid:           { zh-TW: "叫對方花色", en: "Cue bid" }
  nt_overcall:       { zh-TW: "NT 蓋叫", en: "NT overcall" }
  takeout_double:    { zh-TW: "技術性賭倍", en: "Takeout double" }
  penalty_double:    { zh-TW: "懲罰性賭倍", en: "Penalty double" }
  artificial:        { zh-TW: "人工叫品", en: "Artificial bid" }
  raise:             { zh-TW: "加叫搭檔花色", en: "Raise" }
  new_suit:          { zh-TW: "叫新花", en: "New suit" }
  redouble:          { zh-TW: "再賭倍", en: "Redouble" }
```

---

### 🆕 Convention Namespace Registry

#### ID 格式

```
^[a-z][a-z0-9_-]{0,31}/[a-z][a-z0-9_-]{0,63}-v[0-9]+$

範例：
  bbdsl/stayman-v1                   # 官方標準
  bbdsl/stayman-puppet-v1            # 官方 Puppet 變體
  bbdsl/jacoby-transfer-v1           # 官方 Jacoby Transfer
  bbdsl/lebensohl-v1                 # 官方 Lebensohl
  bbdsl/lebensohl-transfer-v1        # Transfer Lebensohl
  bbdsl/dont-v1                      # D.O.N.T. 防禦
  chris/precision-relay-v2           # 個人自訂
  taiwan-cba/super-precision-v1      # 組織自訂
```

#### Scope 管理

| Scope 前綴 | 管理權 | 審核 |
|-----------|--------|------|
| `bbdsl/` | BBDSL 維護團隊 | 同行評審 + 自動驗證通過 |
| `<username>/` | 個人 | 自動驗證通過即可發布 |
| `<org>/` | 組織管理員 | 組織內部審核 |

#### 獨立 Convention 檔案格式 (.bbdsl-conv.yaml)

```yaml
bbdsl_convention: "0.3"

convention:
  id: "bbdsl/stayman-v1"
  name: { zh-TW: "Stayman", en: "Stayman" }
  version: "1.2.0"
  category: "notrump_response"
  tags: [notrump, major_fit, stayman]
  authors:
    - name: "Sam Stayman"
  license: "CC-BY-SA-4.0"

  description:
    zh-TW: "對 NT 開叫後問四張高花的標準約定"
    en: "Standard convention asking for 4-card major after NT opening"

  # ── 參數化介面 ──
  parameters:
    nt_bid:
      type: bid
      default: "1NT"
      description: { zh-TW: "觸發的 NT 開叫" }
    response_bid:
      type: bid
      default: "2C"
      description: { zh-TW: "Stayman 叫品" }
    garbage_stayman:
      type: boolean
      default: true
      description: { zh-TW: "允許垃圾 Stayman" }

  # ── 關係宣告 ──
  conflicts_with: ["bbdsl/puppet-stayman-v1"]
  requires: []
  recommends: ["bbdsl/smolen-v1"]

  # ── 觸發條件 ──
  trigger:
    after: ["${nt_bid}"]
    bid: "${response_bid}"

  # ── 叫牌樹 ──
  responses:
    - bid: "2D"
      by: opener
      meaning:
        description: { zh-TW: "否認四張高花", en: "Denies 4-card major" }
        hand: { hearts: { max: 3 }, spades: { max: 3 } }
      continuations:
        - bid: "Pass"
          by: responder
          when: "${garbage_stayman}"
          meaning:
            description: { zh-TW: "垃圾 Stayman 逃到方塊" }
            hand: { hcp: { max: 7 } }
            forcing: signoff

        - bid: "2H"
          by: responder
          meaning:
            description: { zh-TW: "邀請，五張紅心" }
            hand: { hearts: { min: 5 }, hcp: { min: 8, max: 9 } }
            forcing: invitational

        - bid: "2S"
          by: responder
          meaning:
            description: { zh-TW: "邀請，五張黑桃" }
            hand: { spades: { min: 5 }, hcp: { min: 8, max: 9 } }
            forcing: invitational

        - bid: "2NT"
          by: responder
          meaning:
            description: { zh-TW: "邀請 3NT，無四張高花" }
            hand: { hcp: { min: 8, max: 9 }, hearts: { max: 3 }, spades: { max: 3 } }
            forcing: invitational

        - bid: "3NT"
          by: responder
          meaning:
            description: { zh-TW: "止叫 3NT" }
            hand: { hcp: { min: 10 }, hearts: { max: 3 }, spades: { max: 3 } }
            forcing: signoff

    - bid: "2H"
      by: opener
      meaning:
        description: { zh-TW: "四張紅心（可能也有四張黑桃）" }
        hand: { hearts: { min: 4 } }
      continuations:
        - bid: "2S"
          by: responder
          meaning:
            description: { zh-TW: "邀請，四張黑桃找配合" }
            hand: { spades: { min: 4 }, hcp: { min: 8, max: 9 } }
            forcing: invitational

        - bid: "2NT"
          by: responder
          meaning:
            description: { zh-TW: "邀請，不配合紅心" }
            hand: { hearts: { max: 3 }, hcp: { min: 8, max: 9 } }
            forcing: invitational

        - bid: "3H"
          by: responder
          meaning:
            description: { zh-TW: "邀請，配合紅心" }
            hand: { hearts: { min: 4 }, hcp: { min: 8, max: 9 } }
            forcing: invitational

        - bid: "3NT"
          by: responder
          meaning:
            description: { zh-TW: "止叫，不配合紅心" }
            hand: { hearts: { max: 3 }, hcp: { min: 10 } }
            forcing: signoff

        - bid: "4H"
          by: responder
          meaning:
            description: { zh-TW: "成局，配合紅心" }
            hand: { hearts: { min: 4 }, hcp: { min: 10 } }
            forcing: signoff

        # Smolen
        - bid: "3S"
          by: responder
          meaning:
            description: { zh-TW: "Smolen：五黑桃四紅心，迫叫成局" }
            hand: { spades: { min: 5 }, hearts: { min: 4 }, hcp: { min: 10 } }
            forcing: game

    - bid: "2S"
      by: opener
      meaning:
        description: { zh-TW: "四張黑桃，非四張紅心" }
        hand: { spades: { min: 4 }, hearts: { max: 3 } }
      continuations:
        - bid: "2NT"
          by: responder
          meaning:
            description: { zh-TW: "邀請，不配合黑桃" }
            hand: { spades: { max: 3 }, hcp: { min: 8, max: 9 } }
            forcing: invitational

        - bid: "3S"
          by: responder
          meaning:
            description: { zh-TW: "邀請，配合黑桃" }
            hand: { spades: { min: 4 }, hcp: { min: 8, max: 9 } }
            forcing: invitational

        - bid: "3NT"
          by: responder
          meaning:
            description: { zh-TW: "止叫" }
            hand: { spades: { max: 3 }, hcp: { min: 10 } }
            forcing: signoff

        - bid: "4S"
          by: responder
          meaning:
            description: { zh-TW: "成局，配合黑桃" }
            hand: { spades: { min: 4 }, hcp: { min: 10 } }
            forcing: signoff

        # Smolen
        - bid: "3H"
          by: responder
          meaning:
            description: { zh-TW: "Smolen：五紅心四黑桃，迫叫成局" }
            hand: { hearts: { min: 5 }, spades: { min: 4 }, hcp: { min: 10 } }
            forcing: game
```

---

### foreach_suit 寫時展開規範

#### 變數替換表

| 表達式 | 當 M=H 時 | 當 M=S 時 |
|--------|-----------|-----------|
| `${M}` | H | S |
| `${M.lower}` | h | s |
| `${M.zh-TW}` | 紅心 | 黑桃 |
| `${M.en}` | hearts | spades |
| `${M.symbol}` | ♥ | ♠ |
| `${M.transfer_from}` | D | H |
| `${M.rank}` | 2 | 3 |
| `${M.color}` | red | black |
| `${M.group}` | major | major |
| `${M.other}` | S | H |

#### 展開流程

```
原始 YAML (含 foreach_suit)
        │
        ▼
   展開器 (expander)
        │  讀取 suit_groups
        │  替換所有 ${variable} 及衍生屬性
        │  產生 N 個叫牌節點
        ▼
  展開後 JSON (intermediate)
        │  每個節點帶 _expanded_from 元資料
        ▼
   驗證器 (validator)     渲染器 (renderer)     匯出器 (exporter)
```

#### 巢狀限制

- 最多兩層巢狀
- 內層 variable 名不得與外層相同

---

### 🆕 shape 符號規則（統一規格）

| 符號 | 含義 | 範例 | 用途 |
|------|------|------|------|
| `"4-3-3-3"` | 花色長度由大到小，不指定花色 | 任何 4333 牌型 | patterns.shapes |
| `"4=4=1=4"` | 精確 ♠=♥=♦=♣ | 僅 ♠4♥4♦1♣4 | patterns.shapes_exact |
| `"4=5=*=*"` | 部分精確，* 任意 | ♠4♥5，低花任意 | patterns.shapes_exact |
| `"(45)22"` | 括弧內任意排列 | 4=5=2=2 或 5=4=2=2 | patterns.shapes_exact |
| `"x-x-x-x"` | x 為任意 | 搭配 constraints 使用 | patterns.shapes |

與 Dealer `shape()` 函數的對應：
```
Dealer:  shape(north, any 4333 + any 4432)
BBDSL:   shape: { ref: "balanced" }     # balanced = ["4-3-3-3", "4-4-3-2", "5-3-3-2"]

Dealer:  shape(north, 4414 + 4405)
BBDSL:   shape: { ref: "precision_2d" } # shapes_exact: ["4=4=1=4", "4=4=0=5"]
```

---

### 🆕 defense_to 區塊

```yaml
defense_to:
  - opponent_system: "strong_club"
    description:
      zh-TW: "對強梅花制度的防禦"
      en: "Defense vs Strong Club"
    when_opponent_opens:
      bid: "1C"
      known_artificial: true

    actions:
      - bid: "X"
        meaning:
          description: { zh-TW: "顯示高花" }
          hand:
            hearts: { min: 4 }
            spades: { min: 4 }
            hcp: { min: 10 }

      - bid: "1NT"
        meaning:
          description: { zh-TW: "顯示低花" }
          hand:
            clubs: { min: 4 }
            diamonds: { min: 4 }
            hcp: { min: 10 }

  - opponent_system: "weak_nt"
    description: { zh-TW: "對弱無王的防禦" }
    when_opponent_opens:
      bid: "1NT"
      known_range: { min: 12, max: 14 }
    convention_ref: "bbdsl/dont-v1"
```

---

### 驗證規則（v0.3 完整版，12 條）

```yaml
validation:
  rules:
    # ── 結構完整性 ──
    - id: "val-001-hcp-coverage"
      description: { zh-TW: "開叫 HCP 區間應覆蓋 0-37 無遺漏" }
      severity: warning
      scope: openings

    - id: "val-002-no-overlap"
      description: { zh-TW: "同層級叫品的 HCP+牌型條件不應重疊" }
      severity: error
      scope: all

    - id: "val-003-response-complete"
      description: { zh-TW: "每個開叫應定義回應體系" }
      severity: warning
      scope: openings

    # ── 引用完整性 ──
    - id: "val-004-convention-ref-exists"
      description: { zh-TW: "引用的 Convention 必須存在" }
      severity: error
      scope: all

    - id: "val-005-convention-conflicts"
      description: { zh-TW: "互斥 Convention 不應同時啟用" }
      severity: error
      scope: conventions

    - id: "val-006-pattern-ref-exists"
      description: { zh-TW: "引用的 pattern 必須在 definitions 中定義" }
      severity: error
      scope: all

    # ── 語義一致性 ──
    - id: "val-007-forcing-consistency"
      description: { zh-TW: "forcing:game 序列中不應有非迫叫的後續" }
      severity: error
      scope: all

    - id: "val-008-alertable-check"
      description: { zh-TW: "人工叫品必須標記 alertable:true" }
      severity: warning
      scope: all

    # ── 情境一致性 ──
    - id: "val-009-seat-vul-no-conflict"
      description: { zh-TW: "context_overrides 的座位/身價組合不應矛盾" }
      severity: error
      scope: all

    - id: "val-010-foreach-expansion"
      description: { zh-TW: "foreach_suit 展開後不應產生叫品衝突" }
      severity: error
      scope: all

    # ── 🆕 namespace 與格式 ──
    - id: "val-011-convention-id-format"
      description: { zh-TW: "Convention ID 必須符合 namespace 格式" }
      severity: error
      scope: conventions
      pattern: "^[a-z][a-z0-9_-]{0,31}/[a-z][a-z0-9_-]{0,63}-v[0-9]+$"

    # ── 🆕 Dealer 相容性 ──
    - id: "val-012-shape-format"
      description: { zh-TW: "shapes 用 '-' 分隔，shapes_exact 用 '=' 分隔" }
      severity: error
      scope: definitions.patterns
```

---

### 匯出設定（v0.3 含轉換器介面）

```yaml
export:
  bboalert:
    enabled: true
    format_version: "2.5"
    include_comments: true
    seat_dependent: true
    # 匯出時的語系選擇
    locale: "zh-TW"
    # 如何處理 foreach_suit 展開
    expand_foreach: true

  bml:
    enabled: true
    output_formats: [html, latex]
    include_suit_symbols: true
    locale: "en"

  convention_card:
    enabled: true
    format: wbf                          # wbf | acbl
    locale: "en"

  # 🆕 PBN annotation 匯出
  pbn:
    enabled: true
    # 在 PBN 的 [Note] 和 [Auction] 中嵌入制度語義
    embed_meanings: true

  # 🆕 AI/LLM 知識庫匯出
  ai_knowledge_base:
    enabled: true
    format: json                         # json | jsonl
    # 展開所有叫牌序列為扁平路徑
    flatten_sequences: true
    # 包含手牌約束的自然語言描述
    include_nl_descriptions: true
    locale: "zh-TW"

# 🆕 匯入設定
import:
  bml:
    enabled: true
    # BML → BBDSL 轉換器
    # BML 的自由文字描述會保留在 description 欄位
    # 無法自動推斷的 HCP/牌型約束標記為 TODO
    mark_unresolved: true

  bboalert:
    enabled: true
    # BBOalert 的序列→說明映射轉為叫牌樹
    # 無法推斷語義的部分保留原始說明文字
    preserve_raw_text: true
```

---

## 設計原則（v0.3 定版）

### 1. 模組化 (Modularity)
Convention 獨立定義為 `.bbdsl-conv.yaml`，支援 namespace registry、版本化、參數化、互斥/依賴/推薦宣告。

### 2. 繼承性 (Inheritance)
制度 `base` + 節點 `context_overrides`，差異化表達。

### 3. 可驗證性 (Verifiability)
12 條驗證規則，涵蓋結構完整性、引用完整性、語義一致性、情境一致性、格式規範。

### 4. 情境感知 (Context-Awareness)
座位、身價、對手行為完整建模。`when_opponent` 支援具體叫品、抽象分類、範圍、組合、否定。

### 5. 對稱性語法糖 (Symmetry Sugar)
`foreach_suit` 寫時展開，變數替換表完整定義。

### 6. 生態相容 (Ecosystem Compatibility) 🆕
- Hand constraint 語法參考 Dealer script
- 支援 BML 和 BBOalert 匯入
- 匯出到 BBOalert / BML / Convention Card / PBN / AI KB

### 7. 漸進式定義 (Progressive Detail)
`completeness` + 匯入時的 `mark_unresolved`，允許部分完成的制度逐步精煉。

### 8. AI-First 🆕
- JSON 中間格式天然適合 LLM RAG
- `ai_knowledge_base` 匯出格式：扁平化序列 + 自然語言描述
- 結構化語義讓 AI 能「理解」而非只「複述」制度

---

## Roadmap（v0.3 修訂）

### Phase 1: Schema 穩定化（現在 → 4 週）
- [ ] JSON Schema v0.3 定稿
- [ ] 三個完整範例制度：精準制、SAYC、2/1 GF
- [ ] foreach_suit 展開器實作
- [ ] when_opponent 模式匹配引擎

### Phase 2: 核心工具鏈（4 → 10 週）
- [ ] YAML 驗證器（12 條規則）
- [ ] BBOalert 匯出器（立即可用於 BBO）
- [ ] BML 匯入器（降低社群遷移門檻）
- [ ] BML 匯出器（教學出版）

### Phase 3: 視覺化與教學（10 → 16 週）
- [ ] 互動式 HTML Viewer（摺疊、顏色、hover、情境切換）
- [ ] Convention Card 產生器
- [ ] 叫牌樹 SVG 圖表
- [ ] 練習題產生器

### Phase 4: AI 整合（16 → 22 週）
- [ ] AI 知識庫匯出器（JSON/JSONL）
- [ ] 模擬對練引擎（Dealer 發牌 + BBDSL 判斷）
- [ ] 制度比較器
- [ ] Dealer script 條件 ↔ BBDSL hand constraint 雙向轉換

### Phase 5: 社群平台（22 → 30 週）
- [ ] Convention namespace registry（類 npm）
- [ ] 線上 BBDSL 編輯器 + 即時預覽
- [ ] 制度 diff / merge 工具
- [ ] 社群評分與推薦
