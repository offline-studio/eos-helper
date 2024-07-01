
export interface KVStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class CloudflareKV implements KVStorage {
  kv: KVNamespace;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async get(key: string) {
    return this.kv.get(key);
  }

  async set(key: string, value: string) {
    return this.kv.put(key, value);
  }
}

export class MemoryKV implements KVStorage {
  storage: Record<string, string> = {};

  async get(key: string) {
    return this.storage[key] || null;
  }

  async set(key: string, value: string) {
    this.storage[key] = value;
  }
}