import axios, { AxiosInstance } from 'axios';

export class CentralApiService {
  private client: AxiosInstance;
  public baseURL: string;

  constructor(baseURL: string, apiKey?: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.message);
        return Promise.reject(error);
      }
    );
  }

  async get(url: string, config?: any): Promise<any> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  async put(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  async delete(url: string, config?: any): Promise<any> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  // Sync-specific methods
  async pushChanges(terminalId: string, changes: any[]): Promise<any> {
    return this.post('/sync/push', { terminalId, changes });
  }

  async pullChanges(terminalId: string, entityType: string, lastSync: Date): Promise<any> {
    return this.get('/sync/pull', {
      params: { terminalId, entityType, lastSync: lastSync.toISOString() }
    });
  }

  async resolveConflict(conflictId: string, resolvedData: any, resolution: string): Promise<any> {
    return this.post('/sync/resolve', { conflictId, resolvedData, resolution });
  }

  async sendHeartbeat(terminalId: string, status: string): Promise<any> {
    return this.post('/sync/heartbeat', { terminalId, status });
  }
}

