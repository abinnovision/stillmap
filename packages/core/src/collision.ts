import { boxesOverlap } from "./labels.js";

import type { Box } from "./labels.js";

/** Cell size borrowed from MapLibre: most labels fit in one or two cells. */
const CELL_SIZE = 25;

/**
 * A flat uniform bucket grid over the canvas, after MapLibre's GridIndex.
 * Occupants are axis-aligned boxes behind this narrow interface, so a later
 * shape (collision circles for line labels) extends it rather than replacing
 * it. Boxes overhanging the canvas clamp to the edge cells, so nothing is
 * ever lost off-grid.
 */
export class GridIndex {
	private readonly columns: number;
	private readonly rows: number;
	private readonly cells: number[][];
	private readonly boxes = new Map<number, Box>();

	public constructor(width: number, height: number) {
		this.columns = Math.max(1, Math.ceil(width / CELL_SIZE));
		this.rows = Math.max(1, Math.ceil(height / CELL_SIZE));
		this.cells = Array.from({ length: this.columns * this.rows }, () => []);
	}

	public insert(uid: number, box: Box): void {
		this.boxes.set(uid, box);
		this.forEachCell(box, (cell) => {
			cell.push(uid);

			return false;
		});
	}

	public remove(uid: number): void {
		const box = this.boxes.get(uid);

		if (box === undefined) {
			return;
		}

		this.boxes.delete(uid);
		this.forEachCell(box, (cell) => {
			const at = cell.indexOf(uid);

			if (at !== -1) {
				cell.splice(at, 1);
			}

			return false;
		});
	}

	/** True when any occupant overlaps the box. Exits on the first hit. */
	public hitTest(box: Box): boolean {
		return this.forEachCell(box, (cell) =>
			cell.some((uid) => boxesOverlap(box, this.boxes.get(uid) as Box)),
		);
	}

	/** Every distinct occupant overlapping the box. */
	public query(box: Box): readonly number[] {
		const seen = new Set<number>();

		this.forEachCell(box, (cell) => {
			for (const uid of cell) {
				if (!seen.has(uid) && boxesOverlap(box, this.boxes.get(uid) as Box)) {
					seen.add(uid);
				}
			}

			return false;
		});

		return [...seen];
	}

	public boxOf(uid: number): Box | undefined {
		return this.boxes.get(uid);
	}

	/** Walks the cells the box covers until the callback returns true. */
	private forEachCell(box: Box, visit: (cell: number[]) => boolean): boolean {
		const clamp = (value: number, max: number): number =>
			Math.min(max, Math.max(0, value));
		const x1 = clamp(Math.floor(box.minX / CELL_SIZE), this.columns - 1);
		const x2 = clamp(Math.floor(box.maxX / CELL_SIZE), this.columns - 1);
		const y1 = clamp(Math.floor(box.minY / CELL_SIZE), this.rows - 1);
		const y2 = clamp(Math.floor(box.maxY / CELL_SIZE), this.rows - 1);

		for (let y = y1; y <= y2; y++) {
			for (let x = x1; x <= x2; x++) {
				if (visit(this.cells[y * this.columns + x] as number[])) {
					return true;
				}
			}
		}

		return false;
	}
}
