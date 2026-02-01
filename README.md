# 🤖 v-telegram-bot

由 GitHub Copilot SDK Agent 驅動的 AI 程式碼重構機器人

## 📝 專案簡介

**v-telegram-bot** 是一個 Telegram 機器人，利用 GitHub Copilot SDK 提供智能程式碼分析、重構建議和程式碼修改功能。使用者可以直接透過 Telegram 與 AI 助手互動，進行各種程式碼相關的工作。

### ✨ 主要功能

- 🧠 **GitHub Copilot 整合** - 使用官方 Copilot SDK 提供高級 AI 能力
- 💬 **Telegram 機器人** - 透過 Telegram 發送程式碼分析請求
- 🔄 **串流回應** - 即時串流 AI 回應，並顯示進度指示
- 📁 **專案管理** - 支援多個專案，輕鬆切換
- 📊 **程式碼分析** - 分析程式碼變更、生成差異檔、審查補丁
- 🎯 **對話記錄** - 為每個使用者維持對話上下文
- ⚡ **生產就緒** - 適當的錯誤處理、資源清理和管理

---

## 🚀 快速開始

### 前置需求

- **Node.js** 18.0+ ([下載](https://nodejs.org/))
- **GitHub Copilot CLI** 已安裝並配置 ([設定指南](https://github.com/github/copilot-cli))
- **Telegram 機器人令牌** 來自 [@BotFather](https://t.me/BotFather)
- 您的 Telegram 聊天 ID（選擇性，用於管理員通知）

### 步驟 1：複製儲存庫

```bash
git clone https://github.com/vivi3172/v-telegram-bot.git
cd v-telegram-bot
```

### 步驟 2：安裝依賴

```bash
npm install
```

### 步驟 3：配置環境變數

在專案根目錄建立 `.env` 檔案：

```bash
cp .env.example .env
```

編輯 `.env` 並填入您的認證資訊：

```env
# 必填：您從 @BotFather 獲得的 Telegram 機器人令牌
BOT_TOKEN=123456789:ABCDEfghIjklMnoPqrsTuvWxyz

# 選擇性：您的 Telegram 聊天 ID，用於啟動通知
TELEGRAM_ADMIN_CHAT_ID=987654321

# 選擇性：MCP 伺服器配置（如果使用 MCP 工具）
MCP_SERVER_PATH=node C:/path/to/v-mcp/index.js
```

**如何取得您的 Telegram 聊天 ID：**
1. 發送一條訊息到您的機器人
2. 造訪：`https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. 在回應中找到 `chat.id`

### 步驟 4：配置專案（選擇性）

編輯 `projects.config.json` 新增您的專案：

```json
{
  "presets": [
    {
      "alias": "myproject",
      "path": "C:\\Users\\YourName\\Projects\\MyProject",
      "description": "我的專案"
    },
    {
      "alias": "another-app",
      "path": "/home/user/projects/another-app",
      "description": "另一個應用"
    }
  ]
}
```

### 步驟 5：啟動機器人

```bash
# 開發模式（監視檔案變更）
npm run dev

# 生產模式
npm start
```

您應該看到：

```
🚀 Starting v-telegram-bot with Copilot SDK Client...

📁 Loaded 2 preset projects:
  ✅ myproject → C:\Users\YourName\Projects\MyProject
  ✅ another-app → /home/user/projects/another-app

🤖 Initializing Copilot CLI Client...
📡 Starting Copilot CLI connection...
✅ Copilot CLI connected

📱 Initializing Telegram Bot...

✅ Bot started successfully!
📡 Listening for messages...
```

---

## 💬 使用指南

### 基本命令

#### `/start`
顯示歡迎訊息和可用命令

```
/start
```

#### `/project list`
查看所有已配置的專案並在其間切換

```
/project list
```

#### `/project use <別名>`
切換到特定專案

```
/project use myproject
```

#### `/project set <別名>=<路徑>`
註冊新專案

```
/project set myapp=C:\Users\Name\Projects\MyApp
```

#### `/copilot ping`
測試 Copilot CLI 連接

```
/copilot ping
```

### 發送需求

只需發送一條訊息描述您的需求：

```
重構這個函數，提高可讀性

為我的 JavaScript 專案新增 TypeScript 支持

為以下變更生成程式碼差異...

分析這段程式碼是否有潛在問題
```

---

## 📊 使用者介面

### 專案選擇菜單
執行 `/project list` 後，您將看到內聯按鈕：
- 選擇任何專案，✓ 指示目前選項
- 新增專案
- 查看幫助

### 處理回饋
發送請求時，您會看到：
```
⚙️ 正在處理您的需求...

🤖 AI 助手正在進行分析和修改，請稍候 ⏳
```

### 回應格式
Copilot 回應以安全的 Markdown 程式碼區塊發送：
```
[您的 AI 回應在此 - 對 HTML/JS/程式碼內容安全]
```

---

## 🏗️ 專案結構

```
v-telegram-bot/
├── src/
│   ├── agent/
│   │   ├── createAgent.js          # Copilot SDK 初始化
│   │   ├── runAgent.js             # 串流回應處理
│   │   └── createAgent.js          # Agent 上下文管理
│   │
│   ├── telegram/
│   │   └── botHandler.js           # Telegram 機器人事件處理
│   │
│   ├── tools/
│   │   └── mcpClient.js            # MCP 伺服器整合
│   │
│   ├── index.js                    # 應用入口點
│   ├── sessionManager.js           # 使用者會話管理
│   └── formatter.js                # 訊息格式化工具
│
├── projects.config.json            # 預設專案配置
├── .env.example                    # 環境變數模板
├── package.json                    # 依賴和腳本
└── README.md                       # 本文件
```

### 主要元件

| 元件 | 用途 |
|------|------|
| **createAgent.js** | 初始化 GitHub Copilot SDK 客戶端並建立串流會話 |
| **runAgent.js** | 處理串流回應，並進行實時 Telegram 更新 |
| **botHandler.js** | 處理 Telegram 訊息並管理機器人命令 |
| **sessionManager.js** | 維持每個使用者的會話狀態（專案、對話記錄） |
| **mcpClient.js** | 整合模型上下文協議以獲得擴展功能 |
| **formatter.js** | 格式化和拆分長訊息以適應 Telegram（4000 字元限制） |

---

## 🔧 進階配置

### 串流行為

機器人使用 GitHub Copilot SDK 串流模式：
- **逾時：** 180 秒（3 分鐘）用於長時間執行的任務
- **心跳：** 每 5 秒顯示一次「⏳ Copilot 思考中...」
- **Telegram 限流：** 每 2 秒發送一次更新（速率限制安全）

### 訊息格式

所有 Copilot 回應都包含在 Markdown 程式碼區塊中，以安全地顯示：
- HTML/XML 標籤
- JavaScript 程式碼
- SQL 查詢
- 差異和補丁
- 任何原始文字內容

### 環境變數

| 變數 | 必填 | 用途 |
|------|------|------|
| `BOT_TOKEN` | ✅ 是 | Telegram 機器人令牌 |
| `TELEGRAM_ADMIN_CHAT_ID` | ❌ 否 | 啟動通知的聊天 ID |
| `MCP_SERVER_PATH` | ❌ 否 | MCP 伺服器可執行檔路徑 |

---

## 🐛 疑難排解

### 機器人不回應
1. 檢查 `.env` 中的 `BOT_TOKEN` 是否正確
2. 驗證機器人是否正在執行：`npm start` 或 `npm run dev`
3. 檢查控制台日誌是否有錯誤
4. 使用 `/copilot ping` 命令進行測試

### Copilot SDK 初始化失敗
```
❌ Copilot SDK initialization failed
```

**解決方案：**
1. 確保 GitHub Copilot CLI 已安裝：`which gh-copilot` 或 `where gh-copilot`
2. 驗證 Copilot CLI 已驗證身份：`gh copilot --version`
3. 檢查 Copilot CLI 是否在 PATH 中
4. 重新啟動 Copilot CLI 服務

### Telegram 中出現「Unsupported start tag」錯誤
此問題已修復！所有回應現在使用 Markdown 格式（不解析 HTML）。

### 長訊息被截斷
超過 4000 字元的訊息會自動分割為多條 Telegram 訊息。

### 找不到專案路徑
驗證路徑存在且可存取：
- Windows：`C:\path\to\project`
- Unix：`/path/to/project`

---

## 📋 對話流程範例

```
使用者：/project list
機器人：📁 我的專案 [選擇專案按鈕]

使用者：[選擇「myproject」]
機器人：✅ Switched to: myproject
機器人：📌 已選擇專案：myproject
     現在您可以開始輸入需求...

使用者：分析我的元件中的錯誤處理
機器人：⚙️ 正在處理您的需求...
     🤖 AI 助手正在進行分析和修改，請稍候 ⏳
機器人：[串流回應實時更新]
機器人：✅ Copilot 串流已完成

使用者：關於安全性有什麼看法？
機器人：[使用對話記錄 + 專案上下文]
     [AI 關於安全性的回應...]
```

---

## 🔐 安全性與隱私

- ✅ **無外部資料存儲** - 所有會話資料保存在記憶體中
- ✅ **按使用者隔離** - 每個使用者有獨立的會話
- ✅ **安全 HTML 渲染** - 程式碼內容永遠不會解析為 HTML
- ✅ **速率限制** - Telegram 受限以防止濫用
- ✅ **優雅關閉** - 所有資源正確清理

---

## 📦 依賴

| 套件 | 版本 | 用途 |
|------|------|------|
| `@github/copilot-sdk` | ^0.1.20 | GitHub Copilot SDK 整合 |
| `node-telegram-bot-api` | ^0.61.0 | Telegram 機器人 API 包裝 |
| `dotenv` | ^16.0.3 | 環境變數管理 |

---

## 🚦 狀態指示器

在控制台中查看這些指示器：

| 指示器 | 含義 |
|--------|------|
| 🚀 | 啟動中 |
| 📁 | 載入專案 |
| 🤖 | Copilot 初始化 |
| ✅ | 成功 |
| ❌ | 錯誤 |
| 📡 | 網路/串流活動 |
| ⏳ | 等待/思考中 |
| 🛑 | 關閉中 |

---

## 📚 使用範例

### 範例 1：程式碼重構
```
使用者：重構我的登入函數使用 async/await

機器人：[分析專案上下文中的程式碼]
     [返回重構的版本和說明]
```

### 範例 2：程式碼審查
```
使用者：審查這個身份驗證模組的安全問題

機器人：[檢查程式碼]
     [列出潛在的漏洞]
     [建議改進]
```

### 範例 3：生成差異
```
使用者：生成差異以為此函數新增錯誤處理

機器人：[建立前後比較]
     [提供補丁檔]
```

---

## 🤝 貢獻

本專案由開發團隊維護。如有問題或建議：

1. 檢查現有問題：[GitHub Issues](https://github.com/vivi3172/v-telegram-bot/issues)
2. 建立新問題並詳細說明
3. 包含控制台日誌和錯誤訊息

---

## 📄 授權

MIT 授權 - 詳見 LICENSE 檔案

---

## 🔗 資源

- [GitHub Copilot SDK 文檔](https://github.com/github/copilot-cli)
- [Telegram 機器人 API](https://core.telegram.org/bots/api)
- [Node.js 文檔](https://nodejs.org/docs/)
- [專案儲存庫](https://github.com/vivi3172/v-telegram-bot)

---

## 🎯 後續步驟

1. ✅ 安裝並啟動機器人
2. 📁 在 `projects.config.json` 中新增您的專案
3. 💬 發送您的第一個程式碼分析請求
4. 🔄 觀看實時 AI 回應在 Telegram 中串流顯示
5. 📚 探索進階功能和整合

**需要幫助？** 查看疑難排解部分或查看上方的範例命令。

---

**最後更新：** 2026 年 2 月  
**版本：** 2.0.0  
**狀態：** 生產就緒 ✅
