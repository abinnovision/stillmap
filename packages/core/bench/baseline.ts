import type { Bench, BenchFn, BenchRunOptions } from "vitest";

const file = (name: string): string =>
	`bench/.baseline/${name.replaceAll(/\W+/g, "-")}.json`;

/**
 * Runs the cases as one comparison. With `BENCH_BASELINE` set, each result is
 * saved; with `BENCH_COMPARE` set, the saved results join the table.
 */
export const run = async (
	bench: Bench,
	cases: Record<string, BenchFn>,
	options: BenchRunOptions = {},
): Promise<void> => {
	const save = process.env["BENCH_BASELINE"] !== undefined;
	const compare = process.env["BENCH_COMPARE"] !== undefined;

	const current = Object.entries(cases).map(([name, fn]) =>
		bench(name, save ? { writeResult: file(name) } : {}, fn),
	);

	const saved = compare
		? current.map((c) => bench.from(`${c.name} (baseline)`, file(c.name)))
		: [];

	const all = [...current, ...saved];

	if (all.length === 1) {
		await all[0]?.run(options);
	} else {
		await bench.compare(...all, options);
	}
};
