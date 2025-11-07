export class SyncLogger {
  info(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SYNC] ${message}`, meta || '');
  }

  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [SYNC ERROR] ${message}`, error || '');
  }

  warn(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [SYNC WARN] ${message}`, meta || '');
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [SYNC DEBUG] ${message}`, meta || '');
    }
  }
}

