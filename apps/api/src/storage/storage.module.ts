import { Global, Logger, Module } from '@nestjs/common';
import { MemoryStorageAdapter } from './memory-storage.adapter';
import { S3StorageAdapter } from './s3-storage.adapter';
import { STORAGE_PORT } from './storage.port';

function useMemoryStorage(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  if (process.env.STORAGE_BACKEND === 'memory') return true;
  if (process.env.STORAGE_BACKEND === 's3') return false;
  // Local dev: memory unless explicitly STORAGE_BACKEND=s3 (MinIO optional)
  if (process.env.NODE_ENV !== 'production') return true;
  const key = process.env.S3_ACCESS_KEY?.trim();
  const secret = process.env.S3_SECRET_KEY?.trim();
  if (!key || !secret) return true;
  return false;
}

@Global()
@Module({
  providers: [
    MemoryStorageAdapter,
    S3StorageAdapter,
    {
      provide: STORAGE_PORT,
      useFactory: (
        memory: MemoryStorageAdapter,
        s3: S3StorageAdapter,
      ) => {
        if (useMemoryStorage()) {
          const reason =
            process.env.NODE_ENV === 'test'
              ? 'test environment'
              : process.env.STORAGE_BACKEND === 'memory'
                ? 'STORAGE_BACKEND=memory'
                : process.env.NODE_ENV !== 'production'
                  ? 'local development default'
                  : 'S3 credentials missing';
          Logger.log(
            `Using in-memory certificate storage (${reason}). PDFs persist until API restart.`,
            'StorageModule',
          );
          return memory;
        }
        return s3;
      },
      inject: [MemoryStorageAdapter, S3StorageAdapter],
    },
  ],
  exports: [STORAGE_PORT],
})
export class StorageModule {}
