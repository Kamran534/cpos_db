/**
 * Input Validation Schemas for Auth Module
 * Provides validation for all auth-related API endpoints
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate username format
 */
export function validateUsername(username: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!username) {
    errors.push('Username is required');
    return { valid: false, errors };
  }

  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }

  if (username.length > 50) {
    errors.push('Username must be less than 50 characters');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string | undefined): boolean {
  if (!phone) return true; // Optional field
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate MAC address format
 */
export function validateMacAddress(macAddress: string): boolean {
  // Accept formats: 00:1B:44:11:3A:B7 or 00-15-5D-0D-3D-1B
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(macAddress);
}

/**
 * Validate super admin setup data
 */
export function validateSuperAdminSetup(data: {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.username) {
    errors.push('Username is required');
  } else {
    const usernameValidation = validateUsername(data.username);
    if (!usernameValidation.valid) {
      errors.push(...usernameValidation.errors);
    }
  }

  if (!data.email) {
    errors.push('Email is required');
  } else if (!validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.password) {
    errors.push('Password is required');
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (!data.firstName) {
    errors.push('First name is required');
  } else if (data.firstName.trim().length < 1) {
    errors.push('First name cannot be empty');
  }

  if (!data.lastName) {
    errors.push('Last name is required');
  } else if (data.lastName.trim().length < 1) {
    errors.push('Last name cannot be empty');
  }

  // Optional fields
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate admin login data
 */
export function validateAdminLogin(data: {
  username?: string;
  password?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.username) {
    errors.push('Username is required');
  } else if (data.username.trim().length === 0) {
    errors.push('Username cannot be empty');
  }

  if (!data.password) {
    errors.push('Password is required');
  } else if (data.password.length === 0) {
    errors.push('Password cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate user creation data
 */
export function validateUserCreation(data: {
  storeId?: string;
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phone?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.storeId) {
    errors.push('storeId is required');
  } else if (!validateUUID(data.storeId)) {
    errors.push('Invalid storeId format (must be UUID)');
  }

  if (!data.username) {
    errors.push('Username is required');
  } else {
    const usernameValidation = validateUsername(data.username);
    if (!usernameValidation.valid) {
      errors.push(...usernameValidation.errors);
    }
  }

  if (!data.email) {
    errors.push('Email is required');
  } else if (!validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  if (!data.password) {
    errors.push('Password is required');
  } else {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (!data.firstName) {
    errors.push('First name is required');
  } else if (data.firstName.trim().length < 1) {
    errors.push('First name cannot be empty');
  }

  if (!data.lastName) {
    errors.push('Last name is required');
  } else if (data.lastName.trim().length < 1) {
    errors.push('Last name cannot be empty');
  }

  if (!data.role) {
    errors.push('Role is required');
  } else {
    const validRoles = ['SUPER_ADMIN', 'STORE_MANAGER', 'ASSISTANT_MANAGER', 'CASHIER', 'INVENTORY_MANAGER', 'CUSTOMER_SERVICE'];
    if (!validRoles.includes(data.role)) {
      errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
  }

  // Optional fields
  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone number format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate store registration data
 */
export function validateStoreRegistration(data: {
  storeCode?: string;
  storeName?: string;
  email?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.storeCode) {
    errors.push('storeCode is required');
  } else if (data.storeCode.trim().length < 1) {
    errors.push('storeCode cannot be empty');
  } else if (!/^[A-Z0-9_-]+$/.test(data.storeCode)) {
    errors.push('storeCode can only contain uppercase letters, numbers, underscores, and hyphens');
  }

  if (!data.storeName) {
    errors.push('storeName is required');
  } else if (data.storeName.trim().length < 1) {
    errors.push('storeName cannot be empty');
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate branch registration data
 */
export function validateBranchRegistration(data: {
  storeId?: string;
  branchCode?: string;
  branchName?: string;
  email?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.storeId) {
    errors.push('storeId is required');
  } else if (!validateUUID(data.storeId)) {
    errors.push('Invalid storeId format (must be UUID)');
  }

  if (!data.branchCode) {
    errors.push('branchCode is required');
  } else if (data.branchCode.trim().length < 1) {
    errors.push('branchCode cannot be empty');
  }

  if (!data.branchName) {
    errors.push('branchName is required');
  } else if (data.branchName.trim().length < 1) {
    errors.push('branchName cannot be empty');
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate terminal registration data
 */
export function validateTerminalRegistration(data: {
  storeId?: string;
  branchId?: string;
  terminalCode?: string;
  terminalName?: string;
  macAddress?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.storeId) {
    errors.push('storeId is required');
  } else if (!validateUUID(data.storeId)) {
    errors.push('Invalid storeId format (must be UUID)');
  }

  if (!data.branchId) {
    errors.push('branchId is required');
  } else if (!validateUUID(data.branchId)) {
    errors.push('Invalid branchId format (must be UUID)');
  }

  if (!data.terminalCode) {
    errors.push('terminalCode is required');
  } else if (data.terminalCode.trim().length < 1) {
    errors.push('terminalCode cannot be empty');
  }

  if (!data.terminalName) {
    errors.push('terminalName is required');
  } else if (data.terminalName.trim().length < 1) {
    errors.push('terminalName cannot be empty');
  }

  if (!data.macAddress) {
    errors.push('macAddress is required');
  } else if (!validateMacAddress(data.macAddress)) {
    errors.push('Invalid MAC address format. Expected format: 00:1B:44:11:3A:B7 or 00-15-5D-0D-3D-1B');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate terminal activation data
 */
export function validateTerminalActivation(data: {
  activationCode?: string;
  macAddress?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.activationCode) {
    errors.push('activationCode is required');
  } else if (!/^\d{6}$/.test(data.activationCode)) {
    errors.push('activationCode must be a 6-digit number');
  }

  if (!data.macAddress) {
    errors.push('macAddress is required');
  } else if (!validateMacAddress(data.macAddress)) {
    errors.push('Invalid MAC address format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate password change data
 */
export function validatePasswordChange(data: {
  currentPassword?: string;
  newPassword?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.currentPassword) {
    errors.push('Current password is required');
  }

  if (!data.newPassword) {
    errors.push('New password is required');
  } else {
    const passwordValidation = validatePassword(data.newPassword);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }

  if (data.currentPassword && data.newPassword && data.currentPassword === data.newPassword) {
    errors.push('New password must be different from current password');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate refresh token request
 */
export function validateRefreshToken(data: {
  refreshToken?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!data.refreshToken) {
    errors.push('refreshToken is required');
  } else if (data.refreshToken.trim().length === 0) {
    errors.push('refreshToken cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

