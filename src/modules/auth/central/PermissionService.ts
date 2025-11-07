import { getPermissionsForRole } from '../types/PermissionTypes.js';

export class PermissionService {
  constructor(private centralDb: any) {}

  /**
   * Get user permissions
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = await this.centralDb.user.findUnique({
        where: { id: userId },
        select: { role: true, permissions: true }
      });

      if (!user) {
        return [];
      }

      // Get base permissions for role
      const rolePermissions = getPermissionsForRole(user.role);

      // Merge with custom permissions
      const customPermissions = user.permissions || [];
      
      // Combine and deduplicate
      const allPermissions = [...new Set([...rolePermissions, ...customPermissions])];

      return allPermissions;
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return [];
    }
  }

  /**
   * Check if user has permission
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  /**
   * Check if user has all of the specified permissions
   */
  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(permission => userPermissions.includes(permission));
  }
}

