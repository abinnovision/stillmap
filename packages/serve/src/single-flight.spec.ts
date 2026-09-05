import { describe, expect, it } from "vitest";

import { createCoalescer } from "./single-flight.js";

describe("createCoalescer", () => {
	const coalesce = createCoalescer();

	it("runs once for concurrent callers on one key", async () => {
		let calls = 0;

		const results = await Promise.all(
			Array.from(
				{ length: 8 },
				async () =>
					await coalesce("shared", async () => {
						calls += 1;
						await Promise.resolve();

						return "value";
					}),
			),
		);

		expect(calls).toBe(1);
		expect(results).toEqual(Array.from({ length: 8 }, () => "value"));
	});

	it("keeps keys isolated", async () => {
		const [a, b] = await Promise.all([
			coalesce("a", () => Promise.resolve("a")),
			coalesce("b", () => Promise.resolve("b")),
		]);

		expect([a, b]).toEqual(["a", "b"]);
	});

	it("is not a cache", async () => {
		let calls = 0;
		const produce = async (): Promise<number> => {
			calls += 1;

			return await Promise.resolve(calls);
		};

		await coalesce("serial", produce);
		await coalesce("serial", produce);

		expect(calls).toBe(2);
	});

	it("gives each server its own map, so two cannot answer each other", async () => {
		const a = createCoalescer();
		const b = createCoalescer();
		let calls = 0;
		const produce = async (): Promise<number> => {
			calls += 1;

			return await Promise.resolve(calls);
		};

		await Promise.all([a("shared", produce), b("shared", produce)]);

		expect(calls).toBe(2);
	});

	it("does not memoise a rejection", async () => {
		await expect(
			coalesce("failing", () => Promise.reject(new Error("boom"))),
		).rejects.toThrow("boom");

		await expect(
			coalesce("failing", () => Promise.resolve("ok")),
		).resolves.toBe("ok");
	});
});
