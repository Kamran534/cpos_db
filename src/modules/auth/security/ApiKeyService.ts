import { CryptoService } from './CryptoService.js';

export class ApiKeyService {
  private cryptoService: CryptoService;

  constructor() {
    this.cryptoService = new CryptoService();
  }

  /**
   * Generate new API key
   */
  async generateApiKey(): Promise<string> {
    return await this.cryptoService.generateApiKey();
  }

  /**
   * Validate API key format
   */
  isValidApiKeyFormat(apiKey: string): boolean {
    // API keys should be 64 character hex strings
    return /^[a-f0-9]{64}$/i.test(apiKey);
  }

  /**
   * Mask API key for display (show only first and last 8 characters)
   */
  maskApiKey(apiKey: string): string {
    if (apiKey.length < 16) {
      return '****';
    }
    return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`;
  }
}

