// Permission Type Definitions

export enum Permission {
  // Store Management
  STORE_READ = 'store:read',
  STORE_WRITE = 'store:write',
  STORE_DELETE = 'store:delete',
  
  // Branch Management
  BRANCH_READ = 'branch:read',
  BRANCH_WRITE = 'branch:write',
  BRANCH_DELETE = 'branch:delete',
  
  // Terminal Management
  TERMINAL_READ = 'terminal:read',
  TERMINAL_WRITE = 'terminal:write',
  TERMINAL_DELETE = 'terminal:delete',
  TERMINAL_ACTIVATE = 'terminal:activate',
  
  // User Management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  USER_RESET_PASSWORD = 'user:reset_password',
  
  // Product Management
  PRODUCT_READ = 'product:read',
  PRODUCT_WRITE = 'product:write',
  PRODUCT_DELETE = 'product:delete',
  
  // Inventory Management
  INVENTORY_READ = 'inventory:read',
  INVENTORY_WRITE = 'inventory:write',
  INVENTORY_ADJUST = 'inventory:adjust',
  
  // Sales Management
  SALE_READ = 'sale:read',
  SALE_CREATE = 'sale:create',
  SALE_UPDATE = 'sale:update',
  SALE_DELETE = 'sale:delete',
  SALE_REFUND = 'sale:refund',
  
  // Customer Management
  CUSTOMER_READ = 'customer:read',
  CUSTOMER_WRITE = 'customer:write',
  CUSTOMER_DELETE = 'customer:delete',
  
  // Reports
  REPORT_READ = 'report:read',
  REPORT_EXPORT = 'report:export',
  
  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
  
  // Sync
  SYNC_READ = 'sync:read',
  SYNC_TRIGGER = 'sync:trigger',
}

export const RolePermissions: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),
  STORE_MANAGER: [
    Permission.STORE_READ,
    Permission.BRANCH_READ,
    Permission.BRANCH_WRITE,
    Permission.TERMINAL_READ,
    Permission.TERMINAL_WRITE,
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_WRITE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_WRITE,
    Permission.SALE_READ,
    Permission.SALE_CREATE,
    Permission.SALE_UPDATE,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_WRITE,
    Permission.REPORT_READ,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
    Permission.SYNC_READ,
    Permission.SYNC_TRIGGER,
  ],
  ASSISTANT_MANAGER: [
    Permission.BRANCH_READ,
    Permission.TERMINAL_READ,
    Permission.USER_READ,
    Permission.PRODUCT_READ,
    Permission.PRODUCT_WRITE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_WRITE,
    Permission.SALE_READ,
    Permission.SALE_CREATE,
    Permission.SALE_UPDATE,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_WRITE,
    Permission.REPORT_READ,
    Permission.SETTINGS_READ,
  ],
  CASHIER: [
    Permission.PRODUCT_READ,
    Permission.INVENTORY_READ,
    Permission.SALE_READ,
    Permission.SALE_CREATE,
    Permission.SALE_UPDATE,
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_WRITE,
  ],
  INVENTORY_MANAGER: [
    Permission.PRODUCT_READ,
    Permission.PRODUCT_WRITE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_WRITE,
    Permission.INVENTORY_ADJUST,
    Permission.REPORT_READ,
  ],
  CUSTOMER_SERVICE: [
    Permission.CUSTOMER_READ,
    Permission.CUSTOMER_WRITE,
    Permission.SALE_READ,
    Permission.SALE_REFUND,
  ],
};

export function getPermissionsForRole(role: string): Permission[] {
  return RolePermissions[role] || [];
}

