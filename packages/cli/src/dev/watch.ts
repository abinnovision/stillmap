import { watch } from "node:fs";

export interface Watcher {
	close: () => void;
}

const DEBOUNCE_MS = 50;

/**
 * Watches the templates directory and calls `onChange` once per burst.
 *
 * Editors write a file in several syscalls, so a save fires more than one
 * event; the debounce collapses them into one reload.
 */
export function watchTemplates(root: string, onChange: () => void): Watcher {
	let timer: NodeJS.Timeout | undefined;

	const watcher = watch(root, { recursive: true }, () => {
		if (timer !== undefined) {
			clearTimeout(timer);
		}

		timer = setTimeout(onChange, DEBOUNCE_MS);
	});

	return {
		close: () => {
			if (timer !== undefined) {
				clearTimeout(timer);
			}

			watcher.close();
		},
	};
}
