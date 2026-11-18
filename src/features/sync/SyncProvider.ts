export interface SyncSnapshot {
  id: string;
  deviceId: string;
  name: string;
}

export interface SyncProvider {
  readonly id: string;
  readonly name: string;
  prepare(): Promise<void>;
  authorize(): Promise<void>;
  listSnapshots(profileId: string): Promise<SyncSnapshot[]>;
  readSnapshot(id: string): Promise<string>;
  writeSnapshot(profileId: string, deviceId: string, encryptedPayload: string): Promise<void>;
  disconnect(): void;
}
