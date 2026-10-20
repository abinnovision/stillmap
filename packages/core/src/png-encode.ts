import { promisify } from "node:util";
import { deflate } from "node:zlib";

const deflateAsync = promisify(deflate);

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* `zlib.crc32` needs Node 22.2, and engines allows any Node 22. */
const CRC_TABLE = new Uint32Array(256);

for (let n = 0; n < 256; n++) {
	let c = n;

	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}

	CRC_TABLE[n] = c >>> 0;
}

function crc32(data: Buffer): number {
	let crc = 0xffffffff;

	for (const byte of data) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
	}

	return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
	const out = Buffer.alloc(12 + data.length);

	out.writeUInt32BE(data.length, 0);
	out.write(type, 4, "ascii");
	data.copy(out, 8);
	out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);

	return out;
}

/**
 * Encodes premultiplied RGBA pixels, as resvg returns them, into an 8-bit RGBA
 * PNG. Every row uses filter 0 and compresses at zlib level 3, off the main
 * thread; on map scenes this is faster than resvg's encoder and smaller.
 */
export async function encodePng(
	pixels: Buffer,
	width: number,
	height: number,
): Promise<Buffer> {
	const stride = width * 4;
	const raw = Buffer.allocUnsafe((stride + 1) * height);

	for (let y = 0; y < height; y++) {
		raw[y * (stride + 1)] = 0;
		pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
	}

	let opaque = true;

	for (let i = 3; i < pixels.length && opaque; i += 4) {
		opaque = pixels[i] === 255;
	}

	/* Opaque pixels stay as copied; translucent ones are un-premultiplied. */
	if (!opaque) {
		for (let y = 0; y < height; y++) {
			const row = y * (stride + 1) + 1;

			for (let i = row + 3; i < row + stride; i += 4) {
				const a = raw[i]!;

				if (a === 255) {
					continue;
				}

				for (let c = i - 3; c < i; c++) {
					raw[c] = a === 0 ? 0 : Math.min(255, Math.round((raw[c]! * 255) / a));
				}
			}
		}
	}

	const ihdr = Buffer.alloc(13);

	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 6;

	return Buffer.concat([
		SIGNATURE,
		chunk("IHDR", ihdr),
		chunk("IDAT", await deflateAsync(raw, { level: 3 })),
		chunk("IEND", Buffer.alloc(0)),
	]);
}
