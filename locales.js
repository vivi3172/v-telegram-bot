/**
 * 多語言本地化配置
 * Language: 繁體中文 (zh-TW)
 */

export const i18n = {
  // 歡迎和菜單相關
  startup: {
    title: '🚀 Bot 服務已啟動！',
    welcome: '👋 歡迎使用代碼變更智慧助手！',
    description: '我是您的AI編碼助手，幫助您快速分析需求和生成代碼變更。',
    promptAction: '點擊下方按鈕開始：',
    start_message: '👋 歡迎使用代碼變更智慧助手！\n\n我可以幫助您：\n✨ 分析代碼變更需求\n✨ 生成代碼差異\n✨ 安全應用補丁\n✨ 計劃重構任務\n\n請點擊下方選項開始使用！',
  },

  // 主菜單按鈕
  mainMenu: {
    projectButton: '📁 查看/切換專案',
    projectButtonDesc: '查看已註冊的項目或切換到其他項目',
    addProjectButton: '➕ 加入新專案',
    addProjectButtonDesc: '添加一個新的項目到您的列表',
    helpButton: '📖 查看詳細幫助',
    helpButtonDesc: '查看所有可用的命令和功能',
    backButton: '◀️ 返回菜單',
  },

  // 項目菜單
  projectMenu: {
    title: '📁 我的專案',
    noProjects: '❌ 您還沒有任何項目\n\n請點擊 ➕ 加入新專案 來添加一個！',
    selectProject: '📁 選擇一個項目：',
    currentProject: '✓ ',
    switchSuccess: '✅ 已切換到項目：',
    projectPath: '路徑：',
  },

  // 添加項目菜單
  addProjectMenu: {
    title: '➕ 加入新專案',
    instruction: '請按照以下格式發送您的項目信息：\n\n<code>/project set 別名=/path/to/project</code>\n\n例如：\n<code>/project set demo=C:\\Users\\Project\\Demo</code>\n\n提示：\n• 別名：用於識別項目的簡短名稱\n• 路徑：項目在您電腦上的完整路徑',
    registered: '✅ 項目已註冊：',
    invalidFormat: '❌ 格式不正確！\n\n正確格式：/project set 別名=/path/to/project',
    error: '❌ 添加項目失敗',
  },

  // 幫助菜單
  helpMenu: {
    title: '📖 詳細幫助',
    introduction: '<b>可用命令列表：</b>\n\n',
    commands: {
      start: '<b>/start</b>\n顯示歡迎菜單',
      project_list: '<b>/project list</b>\n查看所有已註冊的項目',
      project_set: '<b>/project set 別名=/路徑</b>\n註冊新項目',
      project_use: '<b>/project use 別名</b>\n切換到指定項目',
      req: '<b>/req 需求描述</b>\n分析您的代碼變更需求',
      change: '<b>/change 需求描述</b>\n為活躍項目生成代碼差異',
      dry_run: '<b>/dry-run</b>\n預覽即將應用的變更',
      apply: '<b>/apply</b>\n應用已批准的變更',
    },
    footer: '<b>快速提示：</b>\n• 使用菜單按鈕進行互動操作\n• 活躍項目將自動用於所有操作\n• 所有變更都經過安全驗證',
    fullGuide: `<b>📖 使用指南</b>

<b>🔄 三步工作流（推薦用法）</b>

1️⃣ <b>/change &lt;需求文字&gt;</b>
分析代碼變更需求，生成變更計畫
例：<code>/change 新增用戶身份驗證功能</code>
• 檢查您是否已選擇專案
• 調用 v-mcp 分析需求
• 顯示變更摘要和修改範圍
• 進入 "analyzed" 狀態

2️⃣ <b>/dry-run</b>
預覽將進行的代碼修改
• 需先執行 /change
• 生成代碼差異預覽
• 顯示將修改的檔案清單
• 明確提示「尚未套用」
• 進入 "diff_generated" 狀態

3️⃣ <b>/apply</b>
應用代碼修改到專案
• 需先執行 /change 和 /dry-run
• 應用差異到實際檔案
• 顯示修改成功結果
• 清空所有暫存資料

---

<b>🛠️ 專案管理</b>

<b>/project set &lt;別名&gt; &lt;路徑&gt;</b>
設定新的專案路徑
例：<code>/project set myapp /home/user/myapp</code>

<b>/project use &lt;別名&gt;</b>
切換至指定專案
例：<code>/project use myapp</code>

<b>/project list</b>
列出所有已設定的專案

---

<b>⚠️ 其他命令</b>

<b>/cancel</b>
取消進行中的變更流程

<b>/req &lt;文字&gt;</b>
分析客戶需求文字（獨立功能）

<b>/start</b>
顯示歡迎訊息

---

<b>📋 狀態説明</b>

狀態流轉：<code>idle → analyzed → diff_generated → idle</code>

• <code>idle</code> - 未開始任何流程
• <code>analyzed</code> - 已分析變更，可執行 /dry-run
• <code>diff_generated</code> - 已預覽差異，可執行 /apply

---

<b>❌ 常見錯誤</b>

跳步會提示當前狀態和建議操作
例如直接執行 /apply 會被拒絕，並提示先執行 /dry-run`,
  },

  // 項目命令相關
  project: {
    selectPrompt: '❌ 請使用 /project list 選擇一個項目',
    switchingTo: '✅ 已切換到項目：',
    notFound: '❌ 項目別名 "{alias}" 未找到',
    currentActive: '當前活躍項目：',
    list: {
      title: '📁 已註冊的項目：',
      empty: '❌ 您還沒有任何項目\n請使用 /project set 來添加項目',
      format: '別名: {alias}\n路徑: {path}',
    },
  },

  // 需求分析相關
  requirement: {
    analyzingTitle: '⏳ 正在分析您的需求...',
    analyzeSuccess: '✅ 需求分析完成',
    analyzeFailed: '❌ 需求分析失敗',
    needsText: '❌ 請提供需求文字\n用法：/req <文字>',
    invalidProject: '❌ 請先選擇一個活躍項目',
  },

  // 變更相關
  change: {
    generatingTitle: '⏳ 正在為您的項目生成代碼差異...',
    needsRequirement: '❌ 請指定變更需求\n用法：/change <描述>',
    generateSuccess: '✅ 代碼差異已生成',
    generateFailed: '❌ 生成差異失敗',
    previewTitle: '📊 代碼變更預覽',
    affectedFiles: '受影響的文件：',
    applyPrompt: '✅ 準備好應用了嗎？\n\n請輸入 /apply 以應用這些變更',
    dryRunTitle: '🔍 變更預覽',
    noChanges: '❌ 沒有待應用的變更\n\n請先使用 /change 生成變更',
  },

  // 應用變更相關
  apply: {
    applying: '⏳ 正在應用變更...',
    success: '✅ 變更已成功應用！',
    failed: '❌ 應用變更失敗',
    noChanges: '❌ 沒有待應用的變更',
    confirmPrompt: '⚠️ 警告：這將修改您的代碼\n\n請確認您已備份項目，然後輸入 /apply',
  },

  // 錯誤相關
  error: {
    general: '❌ 發生錯誤',
    toolError: '❌ 工具執行失敗',
    mcpError: '❌ 與文件服務器的連接失敗',
    timeout: '❌ 操作超時，請重試',
    invalidInput: '❌ 輸入無效',
  },

  // 成功相關
  success: {
    general: '✅ 操作成功完成',
    saved: '✅ 已保存',
    applied: '✅ 已應用',
  },

  // 狀態相關
  status: {
    processing: '⏳ 處理中...',
    pending: '⏸️ 待處理',
    ready: '✅ 就緒',
    failed: '❌ 失敗',
  },

  // 控制台日誌相關
  console: {
    botStarting: '🤖 Telegram bot 正在運行...',
    presetsLoaded: '📁 已加載 {count} 個預設項目：',
    presetAdded: '✅ {alias} → {path}',
    activeProjectSet: '✅ 設置活躍項目：{alias}',
    presetsAddedToSession: '✅ 已添加 {count} 個預設項目到用戶會話',
    projectListSent: '✅ 已發送項目列表菜單給用戶 {userId}',
    menuSent: '✅ 啟動菜單已發送給用戶 {userId}',
    botReady: '✅ Bot 就緒！',
    sendingStartupNotification: '📤 發送啟動通知 - 項目列表菜單...',
    usersCanUseStart: '💡 用戶可以發送 /start 命令打開菜單',
  },

  // 警告訊息相關
  warnings: {
    presetsNotFound: '⚠️  projects.config.json 未找到',
    noPresetsInConfig: '⚠️  projects.config.json 中未找到預設項目',
    configError: '❌ 錯誤：BOT_TOKEN 未在 .env 文件中設置',
    pollingError: '❌ Polling 錯誤：',
  },

  // /project 命令相關
  projectCommands: {
    listNotSet: '📋 尚未設定任何專案\n用法：/project set <alias> <path>',
    invalidFormat: '❌ 用法不正確\n/project set <別名> <路徑>',
    invalidUseFormat: '❌ 用法不正確\n/project use <別名>',
    unknownSubcommand: '❌ 未知的 /project 子指令\n\n可用的子指令：\n• set - 設定專案\n• use - 切換專案\n• list - 列出專案',
    commandError: '❌ 執行指令時出錯',
  },

  // /change 命令相關
  changeCommand: {
    needsRequirement: '❌ 請提供需求文字\n用法：/change <需求文字>',
    requirementAnalyzing: '⏳ 正在分析您的需求...',
    requirementAnalyzeSuccess: '✅ 需求分析完成',
    requirementAnalyzeFailed: '❌ 需求分析失敗',
    noProject: '❌ 請先使用 /project list 選擇一個項目',
    flowInProgress: '⚠️ 無法執行 /change\n\n目前已有進行中的流程',
    generateDiffFailed: '❌ 生成差異失敗：{error}',
    generateDiffSuccess: '✅ 已生成代碼差異',
    readyForDryRun: '準備好預覽了嗎？\n\n請輸入 /dry-run 命令',
    commandError: '❌ 執行 /change 時出錯',
  },

  // /dry-run 命令相關
  dryRunCommand: {
    changePreview: '📊 代碼變更預覽',
    affectedFiles: '📝 受影響的文件',
    readyToApply: '準備好應用了嗎？\n\n請輸入 /apply 以應用這些變更',
    generating: '⏳ 正在生成代碼差異預覽...',
    noChanges: '⚠️ 無法執行 /dry-run\n\n尚未開始任何變更流程\n\n請按照順序執行：\n1. /change <需求文字>\n2. /dry-run\n3. /apply',
    needChange: '⚠️ 無法執行 /dry-run\n\n尚未完成需求分析\n\n請先執行：\n/change <需求文字>',
    noState: '⚠️ 無法執行 /dry-run\n\n目前狀態：{status}\n\n請先完成前置步驟',
    commandError: '❌ 執行 /dry-run 時出錯',
  },

  // /apply 命令相關
  applyCommand: {
    applying: '⏳ 正在套用修改到專案中...',
    applySuccess: '✅ 已成功套用修改',
    modifiedFiles: '📝 修改的檔案',
    applySummary: '📌 {summary}',
    applyFailed: '❌ 套用修改失敗',
    noChangesIdle: '⚠️ 無法執行 /apply\n\n尚未開始任何變更流程\n\n請按照順序執行：\n1. /change <需求文字>\n2. /dry-run\n3. /apply',
    noChangesDiffNotReady: '⚠️ 無法執行 /apply\n\n尚未預覽代碼差異\n\n請先執行：\n/dry-run\n\n確認修改內容後再執行 /apply',
    noChangesOther: '⚠️ 無法執行 /apply\n\n目前狀態：{status}\n\n請先完成前置步驟',
    noDiffFound: '⚠️ 沒有找到代碼差異\n\n請先執行 /dry-run 命令',
    commandError: '❌ 執行 /apply 時出錯',
  },

  // /cancel 命令相關
  cancelCommand: {
    cancelSuccess: '✅ 已取消流程',
    nothingToCancel: '❌ 沒有進行中的流程可取消',
    commandError: '❌ 執行 /cancel 時出錯',
  },

  // /req 命令相關
  reqCommand: {
    needsText: '❌ 請提供需求文字\n用法：/req <文字>',
    analyzing: '⏳ 正在分析您的需求...',
    analyzeSuccess: '✅ 需求分析完成',
    analyzeFailed: '❌ 分析失敗：{error}',
    commandError: '❌ 執行 /req 時出錯',
  },

  // 消息處理相關
  messaging: {
    processingError: '❌ 處理訊息時出錯',
    deletingFailed: '⚠️ 刪除訊息失敗（不影響流程）',
  },

  // 項目會話相關
  projectSession: {
    projectAddedSuccess: '✅ 項目已註冊：{alias}',
    projectAddFailed: '❌ 添加項目失敗',
    selectProject: '❌ 請先選擇專案後再執行',
    noChangePlan: '⚠️ 沒有找到變更計畫\n\n請先執行 /change 命令',
    noRequirement: '⚠️ 沒有找到需求文字\n\n請先執行 /change 命令',
    provideMissingContent: '❗請先執行 /change 指令並提供需求內容',
  },
};

/**
 * 獲取本地化字符串
 * @param {string} key - i18n 鍵路徑（例如 'startup.title'）
 * @param {object} params - 參數對象（用於字符串插值）
 * @returns {string} 本地化字符串
 */
export function t(key, params = {}) {
  const keys = key.split('.');
  let value = i18n;

  for (const k of keys) {
    if (value[k] === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
    value = value[k];
  }

  if (typeof value !== 'string') {
    return JSON.stringify(value);
  }

  // 替換參數
  let result = value;
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    result = result.replace(`{${paramKey}}`, paramValue);
  });

  return result;
}
