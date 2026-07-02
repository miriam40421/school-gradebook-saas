export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface StoragePort {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject?(key: string): Promise<void>;
}
