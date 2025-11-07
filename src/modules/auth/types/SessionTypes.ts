// Session Type Definitions

export interface UserSession {
  id: string;
  userId: string;
  terminalId: string;
  sessionToken: string;
  startedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface TerminalSession {
  id: string;
  terminalId: string;
  sessionToken: string;
  startedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
  ipAddress?: string;
}

export interface SessionPayload {
  userId?: string;
  terminalId?: string;
  terminalCode?: string;
  username?: string;
  role?: string;
  storeId?: string;
  branchId?: string;
  type: 'user' | 'terminal' | 'refresh';
  sessionId?: string;
  [key: string]: any; // Allow additional properties for JWT
}

