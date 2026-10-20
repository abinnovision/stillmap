import { crc32, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { encodePng } from "./png-encode.js";

interface Chunk {
	readonly type: string;
	readonly data: Buffer;
	readonly crc: number;
	readonly crcInput: Buffer;
}

function readChunks(png: Buffer): Chunk[] {
	const chunks: Chunk[] = [];

	for (let at = 8; at < png.length;) {
		const length = png.readUInt32BE(at);
		const end = at + 8 + length;

		chunks.push({
			type: png.toString("ascii", at + 4, at + 8),
			data: png.subarray(at + 8, end),
			crc: png.readUInt32BE(end),
			crcInput: png.subarray(at + 4, end),
		});
		at = end + 4;
	}

	return chunks;
}

/** Inflates the single IDAT chunk and strips each row's filter byte. */
function decode(png: Buffer, width: number): Buffer {
	const idat = readChunks(png).find((chunk) => chunk.type === "IDAT")!;
	const raw = inflateSync(idat.data);
	const stride = width * 4 + 1;
	const rows: Buffer[] = [];

	for (let at = 0; at < raw.length; at += stride) {
		expect(raw[at]).toBe(0);
		rows.push(raw.subarray(at + 1, at + stride));
	}

	return Buffer.concat(rows);
}

describe("encodePng", () => {
	const pixels = Buffer.from([
		255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 10, 20, 30, 255, 40, 50, 60,
		255, 70, 80, 90, 255,
	]);

	it("writes a signature, an 8-bit RGBA IHDR, one IDAT and IEND", async () => {
		const png = await encodePng(pixels, 3, 2);
		const chunks = readChunks(png);

		expect(png.subarray(0, 8)).toEqual(
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		);
		expect(chunks.map((chunk) => chunk.type)).toEqual(["IHDR", "IDAT", "IEND"]);

		const ihdr = chunks[0]!.data;

		expect(ihdr.readUInt32BE(0)).toBe(3);
		expect(ihdr.readUInt32BE(4)).toBe(2);
		expect([...ihdr.subarray(8)]).toEqual([8, 6, 0, 0, 0]);
		expect(chunks[2]!.data.length).toBe(0);
	});

	it("writes valid chunk CRCs", async () => {
		for (const chunk of readChunks(await encodePng(pixels, 3, 2))) {
			expect(chunk.crc).toBe(crc32(chunk.crcInput));
		}
	});

	it("stores opaque pixels unchanged behind filter-0 rows", async () => {
		expect(decode(await encodePng(pixels, 3, 2), 3)).toEqual(pixels);
	});

	it("un-premultiplies translucent pixels and keeps transparent ones zero", async () => {
		const png = await encodePng(
			Buffer.from([128, 0, 0, 128, 0, 0, 0, 0, 10, 20, 30, 255]),
			3,
			1,
		);

		expect([...decode(png, 3)]).toEqual([
			255, 0, 0, 128, 0, 0, 0, 0, 10, 20, 30, 255,
		]);
	});
});
