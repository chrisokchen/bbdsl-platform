# BBDSL v0.3 增補精煉
# 基於 deep-research-report.md + usedDSLs_gemini.md 的額外洞察

---

## 新增洞察與設計回應

### 洞察 1：Desiderius 的 Rule-based 邏輯 → 叫牌優先權規則

**來源**：usedDSLs_gemini.md — Desiderius F# DSL 使用 `If nClubs >= 4 and HCP >= 12 -> bid 1 Clubs` 風格

**問題**：BBDSL v0.3 只描述「什麼手牌可以叫什麼」，但當一手牌同時符合多個叫品條件時（例如 16 HCP 五張紅心——符合 1C 也可能符合 1H），**缺少選擇優先權的機制**。

**設計**：新增 `priority` 屬性和頂層 `selection_rules`

```yaml
# ─── 方案 A：節點層級的靜態優先權 ───
openings:
  - bid: "1C"
    id: "bbdsl/precision-1c"
    priority: 100                    # 數字越大優先級越高
    meaning:
      hand: { hcp: { min: 16 } }

  - bid: "1H"
    id: "bbdsl/precision-1h"
    priority: 80
    meaning:
      hand: { hcp: { min: 11, max: 15 }, hearts: { min: 5 } }

  - bid: "1NT"
    id: "bbdsl/precision-1nt"
    priority: 90
    meaning:
      hand: { hcp: { min: 13, max: 15 }, shape: { ref: "balanced" } }

# 選擇邏輯：給定手牌 → 找出所有匹配的開叫 → 取 priority 最高的
# 如果 priority 相同，則報告衝突（驗證器 val-002）

# ─── 方案 B：規則引擎（Desiderius 風格）───
# 當靜態 priority 不夠表達複雜邏輯時，支援 selection_rules

selection_rules:
  opening_selection:
    description:
      zh-TW: "開叫選擇規則（依序評估，第一個匹配的勝出）"
    rules:
      - id: "rule-strong-hand"
        condition: "hcp >= 16"
        select: "1C"
        description: { zh-TW: "16+ HCP 一律開 1C" }

      - id: "rule-nt-range"
        condition: "hcp >= 13 && hcp <= 15 && shape in balanced"
        select: "1NT"
        description: { zh-TW: "13-15 平均牌型開 1NT" }

      - id: "rule-major-5"
        condition: "hcp >= 11 && hcp <= 15 && (hearts >= 5 || spades >= 5)"
        select: "longest_major"
        tiebreak: "higher_suit"          # 等長時叫高花
        description: { zh-TW: "11-15 五張以上高花開叫" }

      - id: "rule-minor"
        condition: "hcp >= 11 && hcp <= 15"
        select: "longer_minor"
        tiebreak: "diamonds"             # 等長時叫方塊
        description: { zh-TW: "11-15 無五張高花，開長低花" }

      - id: "rule-weak-two"
        condition: "hcp >= 5 && hcp <= 10 && longest_suit == 6"
        select: "2_of_longest"
        exclude_suits: ["C"]             # 不開弱二梅花
        description: { zh-TW: "5-10 六張套開弱二" }

      - id: "rule-preempt"
        condition: "hcp >= 5 && hcp <= 10 && longest_suit >= 7"
        select: "3_of_longest"
        description: { zh-TW: "5-10 七張以上開三階先制" }

      - id: "rule-pass"
        condition: "true"                # 兜底規則
        select: "Pass"
        description: { zh-TW: "其他情況不開叫" }
```

### 條件語法（Dealer-compatible expression）

```yaml
# selection_rules 中的 condition 欄位使用 Dealer-compatible 表達式語法

# 可用變數（與 Dealer script 對齊）
#   hcp          = 大牌點
#   controls     = 控制力 (A=2, K=1)
#   losers       = 失墩
#   spades       = 黑桃長度
#   hearts       = 紅心長度
#   diamonds     = 方塊長度
#   clubs        = 梅花長度
#   longest_suit = 最長花色長度
#   shape        = 牌型
#   top3(suit)   = 某花色 AKQ 中持有的數量
#   top5(suit)   = 某花色 AKQJT 中持有的數量
#   hascard(card)= 是否持有特定牌 (e.g., hascard(AS))

# 運算子
#   &&  ||  !   >=  <=  ==  !=  >  <
#   in          (成員檢查，如 shape in balanced)

# 範例
#   "hcp >= 16"
#   "hcp >= 11 && hcp <= 15 && hearts >= 5"
#   "shape in balanced && hcp >= 13"
#   "top3(hearts) >= 2 && hearts >= 6"
#   "longest_suit >= 7 && hcp <= 10"
```

---

### 洞察 2：PBN 作為資料交換層的核心地位

**來源**：deep-research-report.md — 「若目標是跨工具資料流與研究資料集，PBN 的特性最成熟」

**設計回應**：強化 BBDSL ↔ PBN 的雙向橋接

```yaml
export:
  pbn:
    enabled: true
    version: "2.1"                       # PBN 2.1 標準
    features:
      # 在 PBN [Note] tag 中嵌入 BBDSL 語義
      embed_bid_meanings: true
      # 範例輸出：
      # [Note "1:artificial, forcing. Strong club, 16+ HCP"]
      # [Note "2:transfer to hearts, 5+ hearts"]

      # 在 PBN [ActionTable] 中加入決策依據
      embed_decision_trace: true
      # 範例：每次叫牌記錄 "為什麼選這個叫品"

      # 產生 Dealer 相容的發牌條件
      generate_dealer_conditions: true
      # 從 BBDSL hand constraint 自動產生 Dealer script
      # 用途：產生「符合特定制度的練習牌」

import:
  pbn:
    enabled: true
    # 從 PBN [Auction] 反向推斷制度
    # 配合 AI 做叫牌序列→制度推斷
    infer_system: false                  # Phase 4+ 才實作
    # 讀取 PBN [Note] 中的 BBDSL 嵌入資料
    read_embedded_bbdsl: true
```

---

### 洞察 3：BML 匯入是降低遷移門檻的關鍵

**來源**：兩份報告都強調；usedDSLs_gemini 明確建議「提供 BML → BBDSL 轉換腳本」

**設計**：定義 BML 匯入的映射規則和限制

```yaml
import:
  bml:
    enabled: true
    version: "2.0"                       # BML 2.0 格式

    # ─── 映射規則 ───
    mapping:
      # BML 的縮排叫牌樹 → BBDSL 的 responses 巢狀結構
      indentation_to_nesting: true

      # BML 的 "1N; 15-17 bal." → BBDSL 的結構化語義
      # 自動解析規則：
      auto_parse:
        # 偵測 HCP 模式："15-17" → hcp: {min: 15, max: 17}
        hcp_pattern: '(\d+)-(\d+)'
        # 偵測牌型關鍵字："bal" → shape: {ref: "balanced"}
        shape_keywords:
          bal: "balanced"
          balanced: "balanced"
          semi-bal: "semi_balanced"
        # 偵測花色長度："5+!h" → hearts: {min: 5}
        suit_length_pattern: '(\d+)\+?[!]?([shdc♠♥♦♣])'
        # 偵測 forcing 語義
        forcing_keywords:
          GF: "game"
          "game force": "game"
          "game forcing": "game"
          INV: "invitational"
          invitational: "invitational"
          NF: "none"
          "non-forcing": "none"
          signoff: "signoff"
          "sign-off": "signoff"
        # 偵測人工/alert
        artificial_keywords:
          artificial: true
          art: true
          relay: true
          puppet: true
          transfer: true

      # BML 的 #COPY/#PASTE → BBDSL Convention ref
      copy_paste_to_convention: true

      # BML 的座位/身價條件 → BBDSL context
      seat_vul_to_context: true

    # ─── 無法自動轉換的處理 ───
    unresolved_handling:
      # 保留原始 BML 文字在 description 欄位
      preserve_original_text: true
      # 在 hand constraint 中標記 _unresolved: true
      mark_unresolved: true
      # 產生 TODO 清單
      generate_todo_list: true

    # ─── 匯入範例 ───
    # BML 輸入：
    #   1N; 15-17 bal.
    #     2C; Stayman
    #       2D; No 4 card major
    #       2H; 4+!h, may have 4!s
    #     2D; Transfer, 5+!h
    #
    # BBDSL 輸出：
    #   - bid: "1NT"
    #     meaning:
    #       description: { en: "15-17 bal." }
    #       hand:
    #         hcp: { min: 15, max: 17 }
    #         shape: { ref: "balanced" }
    #     responses:
    #       - when_opponent: pass
    #         bids:
    #           - bid: "2C"
    #             meaning:
    #               description: { en: "Stayman" }
    #               _bml_original: "Stayman"
    #               hand:
    #                 _unresolved: true     # 無法從 BML 推斷
    #             continuations:
    #               - bid: "2D"
    #                 by: opener
    #                 meaning:
    #                   description: { en: "No 4 card major" }
    #                   hand:
    #                     hearts: { max: 3 }
    #                     spades: { max: 3 }
    #               - bid: "2H"
    #                 by: opener
    #                 meaning:
    #                   description: { en: "4+!h, may have 4!s" }
    #                   hand:
    #                     hearts: { min: 4 }
    #                     # "may have 4!s" 保留為文字，不推斷
    #           - bid: "2D"
    #             meaning:
    #               description: { en: "Transfer, 5+!h" }
    #               hand:
    #                 hearts: { min: 5 }
    #               artificial: true        # "transfer" 關鍵字觸發
```

---

### 洞察 4：生態系定位圖需要更完整

**來源**：deep-research-report.md 的 Mermaid 流程圖只展示了部分路徑

**修訂**：完整的雙向生態系圖

```
                           ┌──────────────────────────────────────────┐
                           │          BBDSL (制度知識庫核心)            │
                           │   結構化語義 · 可驗證 · AI 可讀 · 模組化   │
                           └───┬─────┬─────┬──────┬──────┬───────────┘
                               │     │     │      │      │
           ┌───────────────────┤     │     │      │      ├──────────────┐
           │                   │     │     │      │      │              │
           ▼                   ▼     │     ▼      │      ▼              ▼
    ┌─────────────┐  ┌──────────┐   │  ┌──────┐  │  ┌────────┐  ┌──────────┐
    │  BBOalert   │  │   BML    │   │  │ Conv │  │  │ AI KB  │  │  Dealer  │
    │  匯出/匯入   │  │ 匯出/匯入│   │  │ Card │  │  │ JSON/  │  │  script  │
    │ (線上對打)   │  │(教學出版) │   │  │(WBF/ │  │  │ JSONL  │  │  (發牌)  │
    └──────┬──────┘  └────┬─────┘   │  │ACBL) │  │  └───┬────┘  └────┬─────┘
           │              │         │  └──────┘  │      │             │
           ▼              ▼         ▼            │      ▼             ▼
    ┌─────────────┐  ┌──────────┐ ┌──────────┐  │ ┌──────────┐  ┌──────────┐
    │    BBO      │  │  HTML/   │ │  紙本/   │   │ │ LLM RAG │  │   PBN    │
    │  線上桌面   │  │ LaTeX/PDF│ │  PDF     │   │ │ AI 對練  │  │  資料集  │
    └─────────────┘  └──────────┘ └──────────┘   │ │ AI 教練  │  └────┬─────┘
                                                  │ └──────────┘       │
                                                  │                    ▼
                                                  │              ┌──────────┐
                                                  └──────────────│   LIN    │
                                                                 │  (回放)  │
                                                                 └──────────┘

    ─────── 匯出方向：BBDSL → 目標格式
    ◄────── 匯入方向：來源格式 → BBDSL
    ◄─────► 雙向轉換
```

---

### 洞察 5：BSS (Full Disclosure) 相容性

**來源**：deep-research-report 提到 BSS 是 BBO 早期格式，BBOalert 支援 BSS 匯入

**設計**：在 export 中加入 BSS 支援（低優先但保留介面）

```yaml
export:
  bss:
    enabled: false                       # Phase 3+ 才實作
    description:
      zh-TW: "BBO Full Disclosure 格式（已過時，但部分工具仍使用）"
    # BML 本身已支援 BML → BSS 轉換
    # BBDSL 可透過 BBDSL → BML → BSS 間接達成
    via_bml: true
```

---

### 洞察 6：LIN 回放整合

**來源**：deep-research-report — LIN 用於 BBO 牌局回放/教學展示

**設計**：支援 LIN 嵌入，讓教學工具可以同時展示制度定義和實際牌局

```yaml
export:
  lin:
    enabled: false                       # Phase 4+
    description:
      zh-TW: "產生 LIN 格式的教學牌局（含叫牌註解）"
    features:
      # 在 LIN mb| (make bid) 命令後嵌入制度語義
      embed_bid_annotations: true
      # 配合 HandViewer 展示
      handviewer_compatible: true
```

---

## 更新後的驗證規則（v0.3-final，14 條）

在 v0.3 的 12 條基礎上新增：

```yaml
    # 🆕 叫牌選擇一致性
    - id: "val-013-priority-unique"
      description: { zh-TW: "同層級叫品的 priority 值不應重複" }
      severity: warning
      scope: openings

    - id: "val-014-selection-rules-exhaustive"
      description: { zh-TW: "selection_rules 應覆蓋所有可能的手牌" }
      severity: warning
      scope: selection_rules
```

---

## 完整的六大 DSL 比較矩陣（整合兩份報告）

| 維度 | BBDSL | BML | BBOalert | Dealer | PBN | LIN |
|------|-------|-----|----------|--------|-----|-----|
| **核心用途** | 制度知識庫 | 制度排版 | 線上 Alert | 發牌模擬 | 牌局交換 | 牌局回放 |
| **格式** | YAML | 縮排文字 | CSV-like + regex | C-like script | Tag-based text | 雙字母指令串 |
| **結構化語義** | ✅ HCP/牌型/forcing 全機器可讀 | ❌ 純文字描述 | ❌ 純文字描述 | ✅ 條件語法 | ❌ 叫牌序列無語義 | ❌ |
| **制度完整性** | ✅ 開叫→回應→再叫→競叫 | ✅ 叫牌樹 | ✅ 序列映射 | ❌ 只描述手牌條件 | ❌ 只記錄實際叫牌 | ❌ |
| **驗證能力** | ✅ 14 條規則 | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Convention 模組化** | ✅ namespace registry | ❌ (COPY/PASTE) | ❌ | N/A | N/A | N/A |
| **座位/身價** | ✅ 一等公民 | ⚠️ 部分支援 | ✅ 條件式 | ✅ 條件式 | ✅ [Dealer] tag | ✅ sv 命令 |
| **對手行為建模** | ✅ 完整模式語言 | ⚠️ 競叫語法 | ✅ wildcard | N/A | N/A | N/A |
| **AI 可讀性** | ✅ JSON 中間格式 + RAG 匯出 | ❌ 需 NLP 解析 | ❌ 需 NLP 解析 | ⚠️ 條件可解析 | ⚠️ 序列可解析 | ❌ |
| **社群採用度** | 🆕 尚未發布 | 低 | 高 (BBO 用戶) | 高 (發牌標準) | 高 (資料交換標準) | 高 (BBO 內) |
| **成熟度** | 草案 | 中 | 中-高 | 高 | 高 | 高 |
| **授權** | CC-BY-SA-4.0 | MIT | MPL 2.0 | Public Domain | 開放標準 | 專有 |

### BBDSL 的獨特價值主張

```
BML 能描述「叫什麼」，但不知道「為什麼」
BBOalert 能告訴對手「這是什麼意思」，但不能驗證「有沒有矛盾」
Dealer 能模擬「什麼手牌」，但不能表達「叫牌邏輯」
PBN 能記錄「發生了什麼」，但不能定義「應該怎麼做」

BBDSL = 結構化語義 + 可驗證邏輯 + AI 可讀 + 生態互通
      = 橋牌制度的 OpenAPI Specification
```

---

## Roadmap（最終版，含報告建議的優先排序）

### Phase 1: Schema 穩定化 + MVP 工具（0 → 6 週）
**目標**：讓人能寫出有效的 BBDSL 並看到即時價值
- [ ] JSON Schema v0.3 定稿
- [ ] foreach_suit 展開器（Python）
- [ ] YAML 驗證器（先實作前 8 條核心規則）
- [ ] **BML 匯入器 MVP**（降低遷移門檻，第一優先！）
  - 自動解析 HCP/牌型模式
  - 無法解析的保留為 `_unresolved`
- [ ] 精準制完整範例（作為 dogfood）

### Phase 2: 實戰價值（6 → 12 週）
**目標**：BBDSL 能直接用於 BBO 線上對打
- [ ] BBOalert 匯出器（寫完 BBDSL → 自動產生 Alert 規則）
- [ ] BBOalert 匯入器（現有 BBO 玩家可以匯入）
- [ ] BML 匯出器（教學出版）
- [ ] SAYC + 2/1 GF 範例制度
- [ ] selection_rules 引擎（叫牌優先權判斷）

### Phase 3: 視覺化與教學（12 → 18 週）
- [ ] 互動式 HTML Viewer
- [ ] Convention Card 產生器（WBF/ACBL）
- [ ] 叫牌樹 SVG 圖表
- [ ] 練習題產生器（Dealer 發牌 + BBDSL 判斷）

### Phase 4: AI 整合與模擬（18 → 24 週）
- [ ] AI 知識庫匯出器（JSON/JSONL for RAG）
- [ ] Dealer script ↔ BBDSL hand constraint 雙向轉換
- [ ] 模擬對練引擎
- [ ] 制度比較器
- [ ] PBN 匯出（含 BBDSL 語義嵌入）

### Phase 5: 社群平台（24 → 32 週）
- [ ] Convention namespace registry
- [ ] 線上編輯器 + 即時預覽 + 驗證
- [ ] 制度 diff / merge
- [ ] LIN 教學整合
