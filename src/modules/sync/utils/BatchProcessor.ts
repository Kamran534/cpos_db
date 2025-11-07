export class BatchProcessor {
  constructor(private batchSize: number) {}

  createBatches<T>(items: T[]): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    
    return batches;
  }

  async processInBatches<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const batches = this.createBatches(items);
    const results: R[] = [];

    for (const batch of batches) {
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }

    return results;
  }
}

