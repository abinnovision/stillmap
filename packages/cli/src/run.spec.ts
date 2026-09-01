import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { run } from "./run.js";

import type { DevOptions } from "./dev/start.js";
import type { RunIo } from "./run.js";

function capture(startDev?: RunIo["startDev"]): {
	io: RunIo;
	out: string[];
	err: string[];
} {
	const out: string[] = [];
	const err: string[] = [];

	return {
		io: {
			out: (text) => out.push(text),
			err: (text) => err.push(text),
			...(startDev === undefined ? {} : { startDev }),
		},
		out,
		err,
	};
}

describe("run", () => {
	it("prints the version", async () => {
		const { io, out } = capture();

		expect(await run(["--version"], io)).toBe(0);
		expect(out.join("")).toMatch(/^\d+\.\d+\.\d+\n$/);
	});

	it("prints usage for --help and succeeds", async () => {
		const { io, out } = capture();

		expect(await run(["--help"], io)).toBe(0);
		expect(out.join("")).toContain("stillmap dev [dir]");
	});

	it("prints usage and fails when no command is given", async () => {
		const { io, out } = capture();

		expect(await run([], io)).toBe(1);
		expect(out.join("")).toContain("stillmap dev [dir]");
	});

	it("rejects an unknown command", async () => {
		const { io, err } = capture();

		expect(await run(["serve"], io)).toBe(1);
		expect(err.join("")).toContain("Unknown command: serve");
	});

	it("rejects an unknown flag", async () => {
		const { io, err } = capture();

		expect(await run(["dev", "--turbo"], io)).toBe(1);
		expect(err.join("")).toContain("--turbo");
	});

	it("rejects a port outside the valid range", async () => {
		const { io, err } = capture();

		expect(await run(["dev", "--port", "70000"], io)).toBe(1);
		expect(err.join("")).toContain("--port must be");
	});

	it("starts the server with resolved defaults", async () => {
		const startDev = vi.fn(() => Promise.resolve());
		const { io } = capture(startDev);

		expect(await run(["dev"], io)).toBe(0);
		expect(startDev).toHaveBeenCalledWith(
			expect.objectContaining({
				root: resolve(process.cwd(), "maps"),
				port: 3000,
				open: false,
			}) as DevOptions,
		);
	});

	it("passes the directory, port and open flag through", async () => {
		const startDev = vi.fn(() => Promise.resolve());
		const { io } = capture(startDev);

		expect(await run(["dev", "sites", "--port", "0", "--open"], io)).toBe(0);
		expect(startDev).toHaveBeenCalledWith(
			expect.objectContaining({
				root: resolve(process.cwd(), "sites"),
				port: 0,
				open: true,
			}) as DevOptions,
		);
	});

	it("reports a failure to start with its hint", async () => {
		const startDev = vi.fn(() =>
			Promise.reject(
				Object.assign(new Error("No such directory: maps"), {
					hint: "Create it first.",
				}),
			),
		);
		const { io, err } = capture(startDev);

		expect(await run(["dev"], io)).toBe(1);
		expect(err.join("")).toContain("No such directory: maps");
		expect(err.join("")).toContain("Create it first.");
	});
});
