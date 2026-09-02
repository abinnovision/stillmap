import { describe, expect, it } from "vitest";

import { coalesce } from "./single-flight";

function deferred(): {
	promise: Promise<Uint8Array>;
	resolve: (value: Uint8Array) => void;
	reject: (error: Error) => void;
} {
	let resolve!: (value: Uint8Array) => void;
	let reject!: (error: Error) => void;

	const promise = new Promise<Uint8Array>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}

describe("coalesce", () => {
	it("runs once for concurrent callers on one key", async () => {
		const gate = deferred();
		let calls = 0;

		const waiting = Array.from(
			{ length: 10 },
			async () =>
				await coalesce("same", async () => {
					calls++;

					return await gate.promise;
				}),
		);

		gate.resolve(Uint8Array.of(1, 2, 3));

		const results = await Promise.all(waiting);

		expect(calls).toBe(1);
		expect(results).toHaveLength(10);
		expect(results.every((r) => r === results[0])).toBe(true);
	});

	it("keeps different keys apart", async () => {
		let calls = 0;

		const produce = (): Promise<Uint8Array> => {
			calls++;

			return Promise.resolve(Uint8Array.of(calls));
		};

		await Promise.all([coalesce("a", produce), coalesce("b", produce)]);

		expect(calls).toBe(2);
	});

	it("is not a cache: a settled key runs again", async () => {
		let calls = 0;

		const produce = (): Promise<Uint8Array> => {
			calls++;

			return Promise.resolve(Uint8Array.of(calls));
		};

		await coalesce("again", produce);
		await coalesce("again", produce);

		expect(calls).toBe(2);
	});

	it("does not memoize a rejection", async () => {
		let calls = 0;

		await expect(
			coalesce("flaky", () => {
				calls++;

				return Promise.reject(new Error("transient"));
			}),
		).rejects.toThrow("transient");

		await expect(
			coalesce("flaky", () => {
				calls++;

				return Promise.resolve(Uint8Array.of(7));
			}),
		).resolves.toEqual(Uint8Array.of(7));

		expect(calls).toBe(2);
	});
});
