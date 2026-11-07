interface CloudflareEnv {
  DB: {
    prepare(query: string): unknown;
    batch<T = unknown>(statements: unknown[]): Promise<T[]>;
    exec(query: string): Promise<unknown>;
  };
  MEDIA_BUCKET: BoundMediaBucket;
  ASSETS: { fetch: typeof fetch };
  USE_SHARP?: string;
}

interface BoundMediaBucket {
  put(
    key: string,
    value: Buffer | ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<unknown>;
}
