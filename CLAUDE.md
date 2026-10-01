# CLAUDE.md

本專案的共同 agent instructions 放在 `AGENTS.md`（Codex 與 Claude Code 共用），以下匯入：

@AGENTS.md

**若上面的匯入沒有生效，請直接讀取 `AGENTS.md` 再開始工作。**
那份檔案包含專案架構、部署鐵則，以及 **Learning-First Development** 的完整規則。

---

## Claude Code 專用補充

### 預設是 Learning Mode

**這個專案預設走 Learning Flow，不是預設直接動手。**

只有兩種情況可以直接改：

1. 工作落在 `AGENTS.md` §2.1 的低學習價值清單（CSS 微調、rename、formatting、重複 CRUD⋯⋯）
2. 開發者當次明講「直接幫我改」／「直接幫我調整」／「這次不用教學」／「先完成再說」

**第 2 種只對當次請求有效**，下一個請求自動回到 Learning Mode。
其餘一律先調查、先提問、停下來等回答。**不確定的時候，選教學。**

### 開始工作前

1. 讀 `AGENTS.md`。
2. 若這次的問題屬於 `AGENTS.md` §2.2 的高學習價值主題，**先讀 `LEARNING.md`** 對應能力的 Level，再依 §4 的對照表決定互動深度。

### 三個最容易被忽略的規則

- **不要因為對方說「懂了」就判定理解完成。** 必須聽到用自己的話講出來。
- **Learning Flow 的第 4 步是「停下來等回答」。** 不要自問自答，也不要「先幫你改好了，順便解釋」。
- **`LEARNING.md` 的 Level 只能靠 Evidence 提升**，AI 解釋過、code 跑起來了、功能完成了，都不算。

### 工具使用

- 前台樣式改動完成後，用內建瀏覽器到 `http://localhost:3000` 驗證，桌機與手機都要看，**把結果給對方確認後再 commit**。
- 動到 server 端套件後跑 `pnpm run check:vercel`。
- push 指令：`GIT_SSH_COMMAND="ssh -o BatchMode=yes" git push`
