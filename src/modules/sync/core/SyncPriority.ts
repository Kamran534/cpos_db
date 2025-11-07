export class SyncPriority {
  static readonly PRIORITIES = {
    CRITICAL: 10, // Orders, Payments
    HIGH: 8,      // Inventory, Customers
    MEDIUM: 5,    // Products, Categories
    LOW: 3,       // Reference data
    BACKGROUND: 1 // Historical data
  };

  static getPriorityValue(priority: string): number {
    return this.PRIORITIES[priority as keyof typeof this.PRIORITIES] || 5;
  }

  static getPriorityForEntity(entityType: string, entity?: any): number {
    const priorityMap: Record<string, number> = {
      SaleOrder: entity?.status === 'COMPLETED' ? 10 : 8,
      Payment: 10,
      InventoryItem: 9,
      Customer: 7,
      ReturnOrder: 7,
      Product: 6,
      ProductVariant: 6,
      Category: 4,
      Brand: 4,
      TaxCategory: 3
    };

    return priorityMap[entityType] || 5;
  }
}

