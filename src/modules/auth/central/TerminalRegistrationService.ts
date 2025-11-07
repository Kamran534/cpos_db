import { v4 as uuidv4 } from 'uuid';
import { CryptoService } from '../security/CryptoService.js';
import { EmailService } from '../emails/EmailService.js';
import { AuthError, TerminalRegistrationData, TerminalRegistrationResult, TerminalStatusUpdate } from '../types/AuthTypes.js';

export class TerminalRegistrationService {
  private cryptoService: CryptoService;
  private emailService: EmailService;

  constructor(private centralDb: any) {
    this.cryptoService = new CryptoService();
    this.emailService = new EmailService();
  }

  /**
   * Register new terminal (Admin function)
   */
  async registerTerminal(adminUserId: string, terminalData: TerminalRegistrationData): Promise<TerminalRegistrationResult> {
    // Validate required fields
    if (!terminalData.storeId) {
      throw new AuthError('storeId is required');
    }
    if (!terminalData.branchId) {
      throw new AuthError('branchId is required');
    }
    if (!terminalData.terminalCode) {
      throw new AuthError('terminalCode is required');
    }
    if (!terminalData.terminalName) {
      throw new AuthError('terminalName is required');
    }
    if (!terminalData.macAddress) {
      throw new AuthError('macAddress is required');
    }

    // Verify admin permissions
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId },
      include: { store: true }
    });

    if (!adminUser || !['SUPER_ADMIN', 'STORE_MANAGER'].includes(adminUser.role)) {
      throw new AuthError('Insufficient permissions');
    }

    // Verify store access (SUPER_ADMIN can access any store, STORE_MANAGER only their own)
    if (adminUser.role !== 'SUPER_ADMIN' && adminUser.storeId !== terminalData.storeId) {
      throw new AuthError('Access denied to this store');
    }

    // Verify store exists
    const store = await this.centralDb.store.findUnique({
      where: { id: terminalData.storeId }
    });

    if (!store) {
      throw new AuthError('Store not found');
    }

    // Verify branch exists and belongs to the store
    const branch = await this.centralDb.branch.findUnique({
      where: { id: terminalData.branchId },
      include: { store: true }
    });

    if (!branch) {
      throw new AuthError('Branch not found');
    }

    if (branch.storeId !== terminalData.storeId) {
      throw new AuthError('Branch does not belong to the specified store');
    }

    // Check if terminal code already exists
    const existingTerminal = await this.centralDb.terminal.findUnique({
      where: { terminalCode: terminalData.terminalCode }
    });

    if (existingTerminal) {
      throw new AuthError('Terminal code already exists');
    }

    // Check if MAC address already exists
    const existingMacAddress = await this.centralDb.terminal.findUnique({
      where: { macAddress: terminalData.macAddress }
    });

    if (existingMacAddress) {
      throw new AuthError('MAC address already registered');
    }

    // Check if serial number already exists (if provided)
    if (terminalData.serialNumber) {
      const existingSerial = await this.centralDb.terminal.findUnique({
        where: { serialNumber: terminalData.serialNumber }
      });

      if (existingSerial) {
        throw new AuthError('Serial number already registered');
      }
    }

    // Generate unique identifiers
    const terminalId = uuidv4();
    const apiKey = await this.cryptoService.generateApiKey();
    const activationCode = this.generateActivationCode();

    // Create terminal
    const terminal = await this.centralDb.terminal.create({
      data: {
        id: terminalId,
        storeId: terminalData.storeId,
        branchId: terminalData.branchId,
        locationId: terminalData.locationId,
        terminalCode: terminalData.terminalCode,
        terminalName: terminalData.terminalName,
        macAddress: terminalData.macAddress,
        serialNumber: terminalData.serialNumber,
        apiKey,
        isActive: false, // Not active until activated
        status: 'INACTIVE',
        features: terminalData.features || [],
        allowedIPs: terminalData.allowedIPs || [],
        registeredBy: adminUserId,
        registeredAt: new Date()
      },
      include: {
        store: true,
        branch: true,
        location: true
      }
    });

    // Create activation record
    const activation = await this.centralDb.terminalActivation.create({
      data: {
        terminalId: terminal.id,
        activationCode,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    // Log registration
    await this.centralDb.auditLog.create({
      data: {
        storeId: terminalData.storeId,
        entityType: 'Terminal',
        entityId: terminal.id,
        action: 'CREATE',
        userId: adminUserId,
        changes: JSON.stringify(terminalData)
      }
    });

    // Send activation email to admin
    try {
      const adminUser = await this.centralDb.user.findUnique({
        where: { id: adminUserId },
        select: { email: true }
      });

      if (adminUser?.email) {
        await this.emailService.sendTerminalActivationEmail(adminUser.email, {
          terminalCode: terminal.terminalCode,
          terminalName: terminal.terminalName,
          activationCode: activation.activationCode,
          expiresAt: activation.expiresAt,
          storeName: terminal.store.storeName,
          branchName: terminal.branch.branchName
        });
      }
    } catch (error) {
      console.error('Failed to send terminal activation email:', error);
      // Don't fail registration if email fails
    }

    return {
      success: true,
      terminal: {
        id: terminal.id,
        terminalCode: terminal.terminalCode,
        terminalName: terminal.terminalName
      },
      activationCode: activation.activationCode,
      apiKey: terminal.apiKey,
      expiresAt: activation.expiresAt
    };
  }

  /**
   * Generate activation code (6-digit numeric)
   */
  private generateActivationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * List terminals for store
   */
  async listTerminals(storeId: string, adminUserId: string): Promise<{ terminals: any[]; totalCount: number }> {
    // Verify user has access to this store
    const user = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!user) {
      throw new AuthError('User not found');
    }

    // SUPER_ADMIN can access any store, STORE_MANAGER only their own
    if (user.role !== 'SUPER_ADMIN' && user.storeId !== storeId) {
      throw new AuthError('Access denied');
    }

    // Get terminals and count in parallel
    const [terminals, totalCount] = await Promise.all([
      this.centralDb.terminal.findMany({
        where: { storeId },
        include: {
          branch: true,
          location: true,
          terminalActivation: true
        },
        orderBy: { terminalCode: 'asc' }
      }),
      this.centralDb.terminal.count({
        where: { storeId }
      })
    ]);

    return {
      terminals,
      totalCount
    };
  }

  /**
   * Update terminal status
   */
  async updateTerminalStatus(terminalId: string, adminUserId: string, updates: TerminalStatusUpdate): Promise<void> {
    const terminal = await this.centralDb.terminal.findUnique({
      where: { id: terminalId },
      include: { store: true }
    });

    if (!terminal) {
      throw new AuthError('Terminal not found');
    }

    // Verify admin has access to this terminal's store
    const adminUser = await this.centralDb.user.findUnique({
      where: { id: adminUserId }
    });

    if (!adminUser) {
      throw new AuthError('User not found');
    }

    // SUPER_ADMIN can access any store, STORE_MANAGER only their own
    if (adminUser.role !== 'SUPER_ADMIN' && adminUser.storeId !== terminal.storeId) {
      throw new AuthError('Access denied');
    }

    await this.centralDb.terminal.update({
      where: { id: terminalId },
      data: updates
    });

    // Log status change
    await this.centralDb.auditLog.create({
      data: {
        storeId: terminal.storeId,
        entityType: 'Terminal',
        entityId: terminalId,
        action: 'UPDATE',
        userId: adminUserId,
        changes: JSON.stringify(updates)
      }
    });
  }
}

