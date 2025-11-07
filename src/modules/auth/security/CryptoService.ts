import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export class CryptoService {
  private readonly API_KEY_LENGTH = 32;
  private readonly SESSION_TOKEN_LENGTH = 64;

  /**
   * Generate secure API key
   */
  async generateApiKey(): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(this.API_KEY_LENGTH, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer.toString('hex'));
        }
      });
    });
  }

  /**
   * Generate session token
   */
  generateSessionToken(): string {
    return crypto.randomBytes(this.SESSION_TOKEN_LENGTH).toString('hex');
  }

  /**
   * Hash PIN code for quick login
   */
  async hashPin(pin: string): Promise<string> {
    // Use lower cost for PINs since they're shorter
    return await bcrypt.hash(pin, 8);
  }

  /**
   * Verify PIN code
   */
  async verifyPin(pin: string, hashedPin: string): Promise<boolean> {
    return await bcrypt.compare(pin, hashedPin);
  }

  /**
   * Generate secure random string
   */
  generateRandomString(length: number): string {
    return crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Create HMAC signature for request verification
   */
  createHmacSignature(data: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHmacSignature(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createHmacSignature(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Hash password
   */
  async hashPassword(password: string, rounds: number = 12): Promise<string> {
    return await bcrypt.hash(password, rounds);
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}

