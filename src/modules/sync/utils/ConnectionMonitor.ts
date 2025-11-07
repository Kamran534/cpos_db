export class ConnectionMonitor {
  private isOnline = true;
  private lastCheck = Date.now();
  private checkInterval?: NodeJS.Timeout;

  constructor(
    private checkUrl: string,
    private checkIntervalMs: number = 30000
  ) {}

  start(): void {
    this.checkInterval = setInterval(async () => {
      await this.checkConnection();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.checkUrl, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      this.isOnline = response.ok;
      this.lastCheck = Date.now();
      return this.isOnline;
    } catch (error) {
      this.isOnline = false;
      this.lastCheck = Date.now();
      return false;
    }
  }

  getStatus(): { online: boolean; lastCheck: number } {
    return {
      online: this.isOnline,
      lastCheck: this.lastCheck
    };
  }
}

