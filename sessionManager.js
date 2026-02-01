/**
 * 專案上下文管理
 * 管理用戶的專案別名、路徑以及活動專案
 */

class SessionManager {
  constructor() {
    // 映射：{ userId -> { projectAliases, activeProjectAlias, chatSessions } }
    // chatSessions: { chatId -> { projectPath, requirement, changePlan, diff, lastStep } }
    this.userSessions = new Map();
  }

  /**
   * 獲取或初始化用戶 session
   */
  getUserSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        projectAliases: {},
        activeProjectAlias: null,
        chatSessions: {}, // 為不同的 chatId 維護獨立 session
      });
    }
    return this.userSessions.get(userId);
  }

  /**
   * 獲取或初始化 chat session（用於 /change /dry-run /apply 流程）
   */
  getChatSession(userId, chatId) {
    const userSession = this.getUserSession(userId);
    const key = String(chatId);

    if (!userSession.chatSessions[key]) {
      userSession.chatSessions[key] = {
        projectPath: null,
        requirement: null,
        changePlan: null,
        diff: null,
        lastStep: 'idle', // 'idle' | 'analyzed' | 'diff_generated'
      };
    }

    return userSession.chatSessions[key];
  }

  /**
   * 清空 chat session
   */
  clearChatSession(userId, chatId) {
    const userSession = this.getUserSession(userId);
    const key = String(chatId);
    userSession.chatSessions[key] = {
      projectPath: null,
      requirement: null,
      changePlan: null,
      diff: null,
      lastStep: 'idle',
    };
  }

  /**
   * 設定專案別名與路徑
   * @param {number} userId - Telegram 用戶 ID
   * @param {string} alias - 專案別名
   * @param {string} path - 專案路徑
   * @returns {object} { success, message }
   */
  setProject(userId, alias, path) {
    if (!alias || !path) {
      return {
        success: false,
        message: '❌ 別名與路徑不能為空',
      };
    }

    const session = this.getUserSession(userId);
    session.projectAliases[alias] = path;

    return {
      success: true,
      message: `✅ 專案 "${alias}" 已設定\n路徑：${path}`,
    };
  }

  /**
   * 切換活動專案
   * @param {number} userId - Telegram 用戶 ID
   * @param {string} alias - 專案別名
   * @returns {object} { success, message }
   */
  useProject(userId, alias) {
    const session = this.getUserSession(userId);

    if (!session.projectAliases[alias]) {
      return {
        success: false,
        message: `❌ 專案 "${alias}" 不存在\n請先用 /project set 設定`,
      };
    }

    session.activeProjectAlias = alias;
    const path = session.projectAliases[alias];

    return {
      success: true,
      message: `✅ 已切換至專案 "${alias}"\n路徑：${path}`,
    };
  }

  /**
   * 列出所有設定的專案
   * @param {number} userId - Telegram 用戶 ID
   * @returns {object} { success, message }
   */
  listProjects(userId) {
    const session = this.getUserSession(userId);
    const aliases = Object.keys(session.projectAliases);

    if (aliases.length === 0) {
      return {
        success: true,
        message: '📋 尚未設定任何專案\n用法：/project set <alias> <path>',
      };
    }

    let message = '📁 已設定的專案\n\n';
    aliases.forEach((alias) => {
      const path = session.projectAliases[alias];
      const isActive = alias === session.activeProjectAlias;
      const marker = isActive ? '✓' : ' ';
      message += `[${marker}] ${alias}\n    ${path}\n`;
    });

    if (!session.activeProjectAlias) {
      message += '\n⚠️ 目前尚未選擇活動專案';
    } else {
      message += `\n📌 目前活動：${session.activeProjectAlias}`;
    }

    return {
      success: true,
      message,
    };
  }

  /**
   * 獲取活動專案的路徑
   * @param {number} userId - Telegram 用戶 ID
   * @returns {object} { success, path, alias, message }
   */
  getActiveProject(userId) {
    const session = this.getUserSession(userId);

    if (!session.activeProjectAlias) {
      return {
        success: false,
        message: '❌ 尚未選擇活動專案\n請用 /project use <alias> 選擇',
      };
    }

    const alias = session.activeProjectAlias;
    const path = session.projectAliases[alias];

    return {
      success: true,
      alias,
      path,
      message: `📁 目前專案：${alias}`,
    };
  }
}

// 導出單一 instance（全域 session manager）
export const sessionManager = new SessionManager();
