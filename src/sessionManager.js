/**
 * Session Manager - Project context and state management
 */

class SessionManager {
  constructor() {
    this.userSessions = new Map();
  }

  getUserSession(userId) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, {
        projectAliases: {},
        activeProjectAlias: null,
        chatSessions: {},
      });
    }
    return this.userSessions.get(userId);
  }

  getChatSession(userId, chatId) {
    const userSession = this.getUserSession(userId);
    const key = String(chatId);

    if (!userSession.chatSessions[key]) {
      userSession.chatSessions[key] = {
        projectPath: null,
        requirement: null,
        changePlan: null,
        diff: null,
        lastStep: 'idle',
      };
    }

    return userSession.chatSessions[key];
  }

  setActiveProject(userId, projectAlias) {
    const userSession = this.getUserSession(userId);
    if (userSession.projectAliases[projectAlias]) {
      userSession.activeProjectAlias = projectAlias;
      return true;
    }
    return false;
  }

  registerProject(userId, alias, path) {
    const userSession = this.getUserSession(userId);
    userSession.projectAliases[alias] = path;
    return true;
  }

  getActiveProject(userId) {
    const userSession = this.getUserSession(userId);
    if (!userSession.activeProjectAlias) {
      return null;
    }
    return {
      alias: userSession.activeProjectAlias,
      path: userSession.projectAliases[userSession.activeProjectAlias],
    };
  }

  reset() {
    this.userSessions.clear();
  }
}

export const sessionManager = new SessionManager();
