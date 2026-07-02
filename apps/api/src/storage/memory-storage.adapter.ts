import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import type { StoragePort } from './storage.port';

@Injectable()
export class MemoryStorageAdapter implements StoragePort {
  private readonly store = new Map<string, Buffer>();

  async putObject(key: string, body: Buffer, _contentType: string): Promise<void> {
    this.store.set(key, Buffer.from(body));
  }

  async getObject(key: string): Promise<Buffer> {
    const value = this.store.get(key);
    if (!value) {
      throw new NotFoundException('Object not found');
    }
    return value;
  }

  async deleteObject(key: string): Promise<void> {
    this.store.delete(key);
  }
}
