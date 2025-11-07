// Authentication Type Definitions

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AdminLoginResult {
  success: boolean;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    store: any;
  };
  tokens: AuthTokens;
  permissions: string[];
}

export interface TerminalAuthResult {
  success: boolean;
  terminal: {
    id: string;
    terminalCode: string;
    terminalName: string;
    store: any;
    branch: any;
    location: any;
    features: string[];
  };
  token: string;
}

export interface TerminalActivationResult {
  success: boolean;
  terminal: {
    id: string;
    terminalCode: string;
    terminalName: string;
    apiKey: string;
    store: any;
    branch: any;
    location: any;
    features: string[];
  };
  token: string;
}

export interface TokenRefreshResult {
  success: boolean;
  tokens?: AuthTokens;
  token?: string;
  type: 'user' | 'terminal';
}

export interface TerminalInfo {
  macAddress: string;
  ipAddress: string;
  serialNumber?: string;
  version?: string;
}

export interface TerminalRegistrationData {
  storeId: string;
  branchId: string;
  locationId?: string;
  terminalCode: string;
  terminalName: string;
  macAddress: string;
  serialNumber?: string;
  features?: string[];
  allowedIPs?: string[];
}

export interface TerminalRegistrationResult {
  success: boolean;
  terminal: {
    id: string;
    terminalCode: string;
    terminalName: string;
  };
  activationCode: string;
  apiKey: string;
  expiresAt: Date;
}

export interface TerminalStatusUpdate {
  isActive?: boolean;
  status?: string;
  features?: string[];
  allowedIPs?: string[];
}

export interface CreateUserData {
  storeId: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  permissions?: string[];
  mustChangePassword?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
}

export interface TerminalActivationData {
  activationCode: string;
  macAddress: string;
  ipAddress: string;
  serialNumber?: string;
}

export interface TerminalInitResult {
  success: boolean;
  terminal: any;
  requiresUserLogin: boolean;
}

export interface LocalTerminalInfo {
  macAddress: string;
  ipAddress: string;
}

export interface TerminalLoginResult {
  success: boolean;
  terminal: any;
  source: 'central' | 'offline';
  requiresUserLogin: boolean;
}

export interface UserLoginResult {
  success: boolean;
  user: any;
  session: any;
  permissions: string[];
  source: 'central' | 'offline' | 'pin';
}

export interface SessionValidationResult {
  valid: boolean;
  reason?: string;
  session?: any;
  user?: any;
  terminal?: any;
}

export interface StoreRegistrationData {
  storeCode: string;
  storeName: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  timezone?: string;
  defaultCurrency?: string;
  defaultLanguage?: string;
  subscriptionTier?: string;
}

export interface BranchRegistrationData {
  storeId: string;
  branchCode: string;
  branchName: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  taxRate?: number;
  managerId?: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

