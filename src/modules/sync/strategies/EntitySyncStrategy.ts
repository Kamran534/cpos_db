export abstract class EntitySyncStrategy {
  constructor(
    protected entityType: string,
    protected localDb: any,
    protected centralApi: any
  ) {}

  abstract shouldSync(localEntity: any, centralEntity: any): Promise<boolean>;
  abstract mergeChanges(localData: any, centralData: any): Promise<any>;
  abstract getSyncPriority(entity: any): number;
}

