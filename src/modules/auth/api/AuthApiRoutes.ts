import { Router, Request, Response } from 'express';
import { CentralAuthService } from '../central/CentralAuthService.js';
import { UserService } from '../central/UserService.js';
import { TerminalRegistrationService } from '../central/TerminalRegistrationService.js';
import { StoreRegistrationService } from '../central/StoreRegistrationService.js';
import { BranchRegistrationService } from '../central/BranchRegistrationService.js';
import { AuthMiddleware } from '../middleware/AuthMiddleware.js';
import { PermissionMiddleware } from '../middleware/PermissionMiddleware.js';

export class AuthApiRoutes {
  private authService: CentralAuthService;
  private userService: UserService;
  private terminalRegistrationService: TerminalRegistrationService;
  private storeRegistrationService: StoreRegistrationService;
  private branchRegistrationService: BranchRegistrationService;
  private authMiddleware: AuthMiddleware;
  private permissionMiddleware: PermissionMiddleware;

  constructor(centralDb: any) {
    this.authService = new CentralAuthService(centralDb);
    this.userService = new UserService(centralDb);
    this.terminalRegistrationService = new TerminalRegistrationService(centralDb);
    this.storeRegistrationService = new StoreRegistrationService(centralDb);
    this.branchRegistrationService = new BranchRegistrationService(centralDb);
    this.authMiddleware = new AuthMiddleware();
    this.permissionMiddleware = new PermissionMiddleware(centralDb);
  }

  getRoutes(): Router {
    const router = Router();

    // ============================================
    // SETUP ROUTES (No Authentication Required)
    // ============================================

    /**
     * @openapi
     * /api/auth/setup/super-admin:
     *   post:
     *     tags: [Auth - Setup]
     *     summary: Create initial super admin
     *     description: Create the first super admin user. This endpoint only works if no super admin exists yet. Use this for initial system setup.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [username, email, password, firstName, lastName]
     *             properties:
     *               username:
     *                 type: string
     *                 example: superadmin
     *               email:
     *                 type: string
     *                 format: email
     *                 example: admin@example.com
     *               password:
     *                 type: string
     *                 format: password
     *                 example: SecurePassword123!
     *               firstName:
     *                 type: string
     *                 example: John
     *               lastName:
     *                 type: string
     *                 example: Doe
     *               phone:
     *                 type: string
     *                 example: +1234567890
     *     responses:
     *       201:
     *         description: Super admin created successfully
     *       400:
     *         description: Validation error
     *       409:
     *         description: Super admin already exists
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Super admin already exists. Use the login endpoint or create additional admins via /api/auth/user/create endpoint.
     *                 code:
     *                   type: string
     *                   example: SUPER_ADMIN_EXISTS
     */
    router.post('/setup/super-admin', async (req: Request, res: Response) => {
      try {
        const { username, email, password, firstName, lastName, phone } = req.body;

        if (!username || !email || !password || !firstName || !lastName) {
          return res.status(400).json({ 
            error: 'Missing required fields: username, email, password, firstName, lastName' 
          });
        }

        const superAdmin = await this.userService.createInitialSuperAdmin({
          username,
          email,
          password,
          firstName,
          lastName,
          phone
        });

        res.status(201).json({
          success: true,
          message: 'Super admin created successfully',
          user: {
            id: superAdmin.id,
            username: superAdmin.username,
            email: superAdmin.email,
            firstName: superAdmin.firstName,
            lastName: superAdmin.lastName,
            role: superAdmin.role
          }
        });
      } catch (error: any) {
        // Handle "super admin already exists" case with a clear message
        if (error.message && error.message.includes('Super admin already exists')) {
          return res.status(409).json({ 
            error: 'Super admin already exists. Use the login endpoint or create additional admins via /api/auth/user/create endpoint.',
            code: 'SUPER_ADMIN_EXISTS'
          });
        }
        res.status(400).json({ error: error.message || 'Failed to create super admin' });
      }
    });

    // ============================================
    // AUTHENTICATION ROUTES (No Authentication Required)
    // ============================================

    /**
     * @openapi
     * /api/auth/admin/login:
     *   post:
     *     tags: [Auth - Authentication]
     *     summary: Admin user login
     *     description: Authenticate admin user and return JWT tokens
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [username, password]
     *             properties:
     *               username:
     *                 type: string
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login successful
     *       401:
     *         description: Invalid credentials
     */
    router.post('/admin/login', async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;
        const result = await this.authService.adminLogin(
          username,
          password,
          req.ip || 'unknown',
          req.get('User-Agent') || ''
        );
        res.json(result);
      } catch (error: any) {
        res.status(401).json({ error: error.message });
      }
    });

    /**
     * @openapi
     * /api/auth/refresh:
     *   post:
     *     tags: [Auth - Authentication]
     *     summary: Refresh authentication token
     *     description: Get new access token using refresh token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [refreshToken]
     *             properties:
     *               refreshToken:
     *                 type: string
     *     responses:
     *       200:
     *         description: Token refreshed successfully
     *       401:
     *         description: Invalid refresh token
     */
    router.post('/refresh', async (req: Request, res: Response) => {
      try {
        const { refreshToken } = req.body;
        const result = await this.authService.refreshToken(refreshToken);
        res.json(result);
      } catch (error: any) {
        res.status(401).json({ error: error.message });
      }
    });

    /**
     * @openapi
     * /api/auth/logout:
     *   post:
     *     tags: [Auth - Authentication]
     *     summary: User logout
     *     description: Logout user and invalidate token
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Logout successful
     */
    router.post('/logout', this.authMiddleware.authenticateUser, async (req: Request, res: Response) => {
      try {
        const token = req.headers.authorization!.substring(7);
        await this.authService.logout(req.user!.userId, token);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ============================================
    // TERMINAL ROUTES (No Authentication Required for activate/authenticate)
    // ============================================

    /**
     * @openapi
     * /api/auth/terminal/authenticate:
     *   post:
     *     tags: [Auth - Terminal]
     *     summary: Terminal authentication
     *     description: Authenticate terminal using API key
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [apiKey, macAddress]
     *             properties:
     *               apiKey:
     *                 type: string
     *               macAddress:
     *                 type: string
     *               ipAddress:
     *                 type: string
     *     responses:
     *       200:
     *         description: Authentication successful
     *       401:
     *         description: Authentication failed
     */
    router.post('/terminal/authenticate', async (req: Request, res: Response) => {
      try {
        const { apiKey, macAddress, ipAddress } = req.body;
        const result = await this.authService.authenticateTerminal(apiKey, {
          macAddress,
          ipAddress: ipAddress || req.ip || 'unknown'
        });
        res.json(result);
      } catch (error: any) {
        res.status(401).json({ error: error.message });
      }
    });

    /**
     * @openapi
     * /api/auth/terminal/activate:
     *   post:
     *     tags: [Auth - Terminal]
     *     summary: Terminal activation
     *     description: Activate terminal using activation code
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [activationCode, macAddress]
     *             properties:
     *               activationCode:
     *                 type: string
     *               macAddress:
     *                 type: string
     *               ipAddress:
     *                 type: string
     *     responses:
     *       200:
     *         description: Activation successful
     *       400:
     *         description: Activation failed
     */
    router.post('/terminal/activate', async (req: Request, res: Response) => {
      try {
        const { activationCode, macAddress, ipAddress } = req.body;
        const result = await this.authService.activateTerminal(activationCode, {
          macAddress,
          ipAddress: ipAddress || req.ip || 'unknown'
        });
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // ============================================
    // SUPER ADMIN ROUTES (Requires SUPER_ADMIN role)
    // ============================================

    /**
     * @openapi
     * /api/auth/store/register:
     *   post:
     *     tags: [Auth - Super Admin]
     *     summary: Register new store
     *     description: Register a new store (Super Admin only)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [storeCode, storeName]
     *             properties:
     *               storeCode:
     *                 type: string
     *               storeName:
     *                 type: string
     *     responses:
     *       200:
     *         description: Store registered successfully
     */
    router.post('/store/register',
      this.authMiddleware.authenticateUser,
      this.permissionMiddleware.requireRole(['SUPER_ADMIN']),
      async (req: Request, res: Response) => {
        try {
          const store = await this.storeRegistrationService.registerStore(req.user!.userId, req.body);
          res.json({ success: true, store });
        } catch (error: any) {
          res.status(400).json({ error: error.message });
        }
      }
    );

    // ============================================
    // STORE MANAGER ROUTES (Requires SUPER_ADMIN or STORE_MANAGER role)
    // ============================================

    /**
     * @openapi
     * /api/auth/branch/register:
     *   post:
     *     tags: [Auth - Store Manager]
     *     summary: Register new branch
     *     description: Register a new branch for a store
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [storeId, branchCode, branchName]
     *             properties:
     *               storeId:
     *                 type: string
     *               branchCode:
     *                 type: string
     *               branchName:
     *                 type: string
     *     responses:
     *       200:
     *         description: Branch registered successfully
     */
    router.post('/branch/register',
      this.authMiddleware.authenticateUser,
      this.permissionMiddleware.requireRole(['SUPER_ADMIN', 'STORE_MANAGER']),
      async (req: Request, res: Response) => {
        try {
          const branch = await this.branchRegistrationService.registerBranch(req.user!.userId, req.body);
          res.json({ success: true, branch });
        } catch (error: any) {
          res.status(400).json({ error: error.message });
        }
      }
    );

    /**
     * @openapi
     * /api/auth/terminal/register:
     *   post:
     *     tags: [Auth - Store Manager]
     *     summary: Register new terminal
     *     description: Register a new terminal for a store/branch
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [storeId, branchId, terminalCode, terminalName, macAddress]
     *             properties:
     *               storeId:
     *                 type: string
     *                 description: Store ID (UUID)
     *                 example: "d4b9e387-a104-4d7e-98f1-f56f410602c0"
     *               branchId:
     *                 type: string
     *                 description: Branch ID (UUID)
     *                 example: "fae240fb-c209-41f3-956c-508e5b090587"
     *               terminalCode:
     *                 type: string
     *                 description: Unique terminal code
     *                 example: "TERM001"
     *               terminalName:
     *                 type: string
     *                 description: Terminal display name
     *                 example: "Terminal 1"
     *               macAddress:
     *                 type: string
     *                 description: MAC address of the terminal (required, must be unique)
     *                 example: "00:1B:44:11:3A:B7"
     *               locationId:
     *                 type: string
     *                 description: Location ID (optional)
     *               serialNumber:
     *                 type: string
     *                 description: Serial number (optional, must be unique if provided)
     *               features:
     *                 type: array
     *                 items:
     *                   type: string
     *                 description: Terminal features (e.g., ["POS", "INVENTORY"])
     *               allowedIPs:
     *                 type: array
     *                 items:
     *                   type: string
     *                 description: Allowed IP addresses for terminal access
     *     responses:
     *       200:
     *         description: Terminal registered successfully
     */
    router.post('/terminal/register',
      this.authMiddleware.authenticateUser,
      this.permissionMiddleware.requireRole(['SUPER_ADMIN', 'STORE_MANAGER']),
      async (req: Request, res: Response) => {
        try {
          const result = await this.terminalRegistrationService.registerTerminal(req.user!.userId, req.body);
          res.json(result);
        } catch (error: any) {
          res.status(400).json({ error: error.message });
        }
      }
    );

    /**
     * @openapi
     * /api/auth/terminal/list:
     *   get:
     *     tags: [Auth - Store Manager]
     *     summary: List terminals for store
     *     description: Get list of terminals for a store
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: storeId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: List of terminals
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 terminals:
     *                   type: array
     *                   items:
     *                     type: object
     *                 totalCount:
     *                   type: integer
     *                   description: Total number of terminals for the store
     *                   example: 5
     */
    router.get('/terminal/list',
      this.authMiddleware.authenticateUser,
      async (req: Request, res: Response) => {
        try {
          const { storeId } = req.query;
          const result = await this.terminalRegistrationService.listTerminals(
            storeId as string,
            req.user!.userId
          );
          res.json({ 
            success: true, 
            terminals: result.terminals,
            totalCount: result.totalCount
          });
        } catch (error: any) {
          res.status(400).json({ error: error.message });
        }
      }
    );

    /**
     * @openapi
     * /api/auth/user/create:
     *   post:
     *     tags: [Auth - Store Manager]
     *     summary: Create new user
     *     description: Create a new user (Admin only)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [storeId, username, email, password, firstName, lastName, role]
     *             properties:
     *               storeId:
     *                 type: string
     *               username:
     *                 type: string
     *               email:
     *                 type: string
     *               password:
     *                 type: string
     *               firstName:
     *                 type: string
     *               lastName:
     *                 type: string
     *               role:
     *                 type: string
     *     responses:
     *       200:
     *         description: User created successfully
     */
    router.post('/user/create',
      this.authMiddleware.authenticateUser,
      this.permissionMiddleware.requireRole(['SUPER_ADMIN', 'STORE_MANAGER']),
      async (req: Request, res: Response) => {
        try {
          const user = await this.userService.createUser(req.user!.userId, req.body);
          res.json({ success: true, user });
        } catch (error: any) {
          res.status(400).json({ error: error.message });
        }
      }
    );

    /**
     * @openapi
     * /api/auth/user/list:
     *   get:
     *     tags: [Auth - Store Manager]
     *     summary: List users for store
     *     description: Get list of users for a store
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: storeId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: List of users
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 users:
     *                   type: array
     *                   items:
     *                     type: object
     *                 totalCount:
     *                   type: integer
     *                   description: Total number of users for the store
     *                   example: 10
     */
    router.get('/user/list',
      this.authMiddleware.authenticateUser,
      async (req: Request, res: Response) => {
        try {
          const { storeId } = req.query;
          const result = await this.userService.listUsers(storeId as string, req.user!.userId);
          res.json({ 
            success: true, 
            users: result.users,
            totalCount: result.totalCount
          });
        } catch (error: any) {
          res.status(400).json({ error: error.message });
        }
      }
    );

    // ============================================
    // USER ROUTES (Requires Authentication)
    // ============================================

    /**
     * @openapi
     * /api/auth/user/change-password:
     *   post:
     *     tags: [Auth - User]
     *     summary: Change user password
     *     description: Change password for current user
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [currentPassword, newPassword]
     *             properties:
     *               currentPassword:
     *                 type: string
     *               newPassword:
     *                 type: string
     *     responses:
     *       200:
     *         description: Password changed successfully
     */
    router.post('/user/change-password',
      this.authMiddleware.authenticateUser,
      async (req: Request, res: Response) => {
        try {
          const { currentPassword, newPassword } = req.body;
          await this.userService.changePassword(req.user!.userId, currentPassword, newPassword);
          res.json({ success: true });
        } catch (error: any) {
          res.status(400).json({ error: error.message });
        }
      }
    );

    /**
     * @openapi
     * /api/auth/user/request-password-reset:
     *   post:
     *     tags: [Auth - User]
     *     summary: Request password reset
     *     description: Request password reset email
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *     responses:
     *       200:
     *         description: Password reset email sent (if account exists)
     */
    router.post('/user/request-password-reset', async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        const result = await this.userService.requestPasswordReset(email);
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    return router;
  }
}

