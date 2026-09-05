/**
 * Node types a `Buffer` as `Uint8Array<ArrayBufferLike>`, which is not
 * assignable to `BodyInit`. Narrowing once here keeps every later hand-off
 * trivial.
 */
export type Bytes = Uint8Array<ArrayBuffer>;

/**
 * Where rendered maps live between requests.
 *
 * Deliberately an interface. The filesystem implementation is right for a
 * long-lived server or a container and wrong for serverless, where the disk is
 * ephemeral and per-instance; swapping in Redis, S3 or a blob store changes
 * nothing else.
 *
 * Keys arrive with a file extension, so an implementation that needs a content
 * type can infer one.
 */
export interface OutputStore {
	readonly get: (key: string) => Promise<Bytes | null>;
	readonly set: (key: string, value: Bytes) => Promise<void>;
}

export { cacheStore } from "./cache.js";
export type { CacheStoreOptions } from "./cache.js";
export { fileStore } from "./file.js";
export { nullStore } from "./null.js";
