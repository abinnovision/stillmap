import { boxesOverlap } from "./labels.js";

import type { Box } from "./labels.js";

/** Cell size borrowed from MapLibre: most labels fit in one or two cells. */
const CELL_SIZE = 25;

function clamp(value: number, max: number): number {
	return Math.min(max, Math.max(0, value));
}

/**
 * A flat uniform bucket grid over the canvas, after MapLibre's GridIndex.
 * Occupants are axis-aligned boxes behind this narrow interface, so a later
 * shape (collision circles for line labels) extends it rather than replacing
 * it. Boxes overhanging the canvas clamp to the edge cells, so nothing is
 * ever lost off-grid. Uids index arrays directly, so they should be small
 * non-negative integers.
 */
export class GridIndex {
	private readonly columns: number;
	private readonly rows: number;
	private readonly cells: number[][];
	private readonly boxes: (Box | undefined)[] = [];
	/** Per-uid query generation, deduplicating occupants spanning cells. */
	private readonly stamps: number[] = [];
	private generation = 0;
	private x1 = 0;
	private x2 = 0;
	private y1 = 0;
	private y2 = 0;

	public constructor(width: number, height: number) {
		this.columns = Math.max(1, Math.ceil(width / CELL_SIZE));
		this.rows = Math.max(1, Math.ceil(height / CELL_SIZE));
		this.cells = Array.from({ length: this.columns * this.rows }, () => []);
	}

	public insert(uid: number, box: Box): void {
		this.boxes[uid] = box;
		this.span(box);

		for (let y = this.y1; y <= this.y2; y++) {
			for (let x = this.x1; x <= this.x2; x++) {
				(this.cells[y * this.columns + x] as number[]).push(uid);
			}
		}
	}

	public remove(uid: number): void {
		const box = this.boxes[uid];

		if (box === undefined) {
			return;
		}

		this.boxes[uid] = undefined;
		this.span(box);

		for (let y = this.y1; y <= this.y2; y++) {
			for (let x = this.x1; x <= this.x2; x++) {
				const cell = this.cells[y * this.columns + x] as number[];
				const at = cell.indexOf(uid);

				// Shifts in place: query order depends on cell order.
				if (at !== -1) {
					for (let i = at + 1; i < cell.length; i++) {
						cell[i - 1] = cell[i] as number;
					}

					cell.pop();
				}
			}
		}
	}

	/** True when any occupant overlaps the box. Exits on the first hit. */
	public hitTest(box: Box): boolean {
		this.span(box);

		for (let y = this.y1; y <= this.y2; y++) {
			for (let x = this.x1; x <= this.x2; x++) {
				for (const uid of this.cells[y * this.columns + x] as number[]) {
					if (boxesOverlap(box, this.boxes[uid] as Box)) {
						return true;
					}
				}
			}
		}

		return false;
	}

	/** Every distinct occupant overlapping the box. */
	public query(box: Box): readonly number[] {
		const found: number[] = [];

		this.forEachOverlap(box, (uid) => {
			found.push(uid);
		});

		return found;
	}

	/**
	 * Visits every distinct occupant overlapping the box, in the order
	 * `query` returns them: first seen across cells in row-major order. The
	 * visitor must not query the grid itself.
	 */
	public forEachOverlap(
		box: Box,
		visit: (uid: number, other: Box) => void,
	): void {
		const generation = ++this.generation;
		const stamps = this.stamps;

		this.span(box);

		const { x1, x2, y1, y2 } = this;

		for (let y = y1; y <= y2; y++) {
			for (let x = x1; x <= x2; x++) {
				for (const uid of this.cells[y * this.columns + x] as number[]) {
					if (stamps[uid] === generation) {
						continue;
					}

					stamps[uid] = generation;

					const other = this.boxes[uid] as Box;

					if (boxesOverlap(box, other)) {
						visit(uid, other);
					}
				}
			}
		}
	}

	/** Stores the inclusive cell range the box covers. */
	private span(box: Box): void {
		this.x1 = clamp(Math.floor(box.minX / CELL_SIZE), this.columns - 1);
		this.x2 = clamp(Math.floor(box.maxX / CELL_SIZE), this.columns - 1);
		this.y1 = clamp(Math.floor(box.minY / CELL_SIZE), this.rows - 1);
		this.y2 = clamp(Math.floor(box.maxY / CELL_SIZE), this.rows - 1);
	}
}
