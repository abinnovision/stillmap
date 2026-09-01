#!/usr/bin/env node

import { run } from "./run.js";

/*
 * Templates are bundled before they run, so without this a stack trace points
 * at the bundle rather than the file the author is editing.
 */
process.setSourceMapsEnabled(true);

process.exitCode = await run(process.argv.slice(2), {
	out: (text) => process.stdout.write(text),
	err: (text) => process.stderr.write(text),
});
