import { escapeXml } from "@stillmap/core";

/**
 * The gallery's markup, kept apart from the rendering so that changing the page
 * does not mean reading the render loop. One document, no client-side
 * JavaScript: every map is already a PNG by the time this runs.
 */

export interface GallerySection {
	readonly id: string;
	readonly title: string;
	readonly blurb: string;
	/** Rendered at 2x, so the intrinsic width is half the pixel width. */
	readonly width: number;
	readonly height: number;
	/** Pre-highlighted markup from shiki. */
	readonly code: string;
	readonly sourcePath: string;
	readonly sandboxUrl: string;
}

const STYLE = `
	:root {
		color-scheme: light;
		--paper: #f5f5f3;
		--ink: #35352f;
		--muted: #6e6e68;
		--line: #e0e0da;
		--accent: #5c7a5c;
	}
	* { box-sizing: border-box; }
	body {
		margin: 0;
		padding: 0 24px 96px;
		background: var(--paper);
		color: var(--ink);
		font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI",
			sans-serif;
		-webkit-font-smoothing: antialiased;
	}
	main { max-width: 960px; margin: 0 auto; }
	header.masthead { padding: 96px 0 56px; }
	h1 { margin: 0; font-size: 40px; letter-spacing: -0.02em; }
	.tagline { margin: 12px 0 0; font-size: 19px; color: var(--muted); }
	.links { margin: 28px 0 0; display: flex; flex-wrap: wrap; gap: 10px; }
	.button {
		display: inline-block;
		padding: 9px 16px;
		border: 1px solid var(--line);
		border-radius: 7px;
		background: #fff;
		color: var(--ink);
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
	}
	.button:hover { border-color: var(--accent); color: var(--accent); }
	.button.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.button.primary:hover { background: #4c684c; color: #fff; }
	section.example { padding: 56px 0 0; border-top: 1px solid var(--line); }
	section.example + section.example { margin-top: 56px; }
	h2 { margin: 0; font-size: 24px; letter-spacing: -0.01em; }
	.blurb { margin: 8px 0 24px; color: var(--muted); }
	figure { margin: 0; }
	figure img {
		display: block;
		width: 100%;
		height: auto;
		border: 1px solid var(--line);
		border-radius: 9px;
		background: #fff;
	}
	figcaption {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: baseline;
		justify-content: space-between;
		margin: 10px 2px 0;
		font-size: 13px;
		color: var(--muted);
	}
	figcaption a { color: var(--muted); }
	figcaption .meta { display: flex; gap: 14px; }
	pre.shiki {
		margin: 24px 0 0;
		padding: 20px 22px;
		max-height: 420px;
		overflow: auto;
		border: 1px solid var(--line);
		border-radius: 9px;
		font-size: 13px;
		line-height: 1.65;
		tab-size: 2;
	}
	footer {
		max-width: 960px;
		margin: 96px auto 0;
		padding-top: 28px;
		border-top: 1px solid var(--line);
		font-size: 14px;
		color: var(--muted);
	}
	footer a { color: var(--muted); }
`;

const REPO = "https://github.com/abinnovision/stillmap";

function section(entry: GallerySection): string {
	return `			<section class="example" id="${escapeXml(entry.id)}">
				<h2>${escapeXml(entry.title)}</h2>
				<p class="blurb">${escapeXml(entry.blurb)}</p>
				<figure>
					<img
						src="${escapeXml(entry.id)}.png"
						width="${String(entry.width)}"
						height="${String(entry.height)}"
						alt="${escapeXml(entry.title)}"
						loading="lazy"
					/>
					<figcaption>
						<span>${String(entry.width)} x ${String(entry.height)}, rendered at 2x</span>
						<span class="meta">
							<a href="${REPO}/blob/main/examples/basic/${escapeXml(entry.sourcePath)}"
								>${escapeXml(entry.sourcePath)}</a
							>
							<a href="${escapeXml(entry.sandboxUrl)}">Edit this map</a>
						</span>
					</figcaption>
				</figure>
				${entry.code}
			</section>`;
}

export function page(
	sections: readonly GallerySection[],
	sandboxUrl: string,
): string {
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>stillmap examples</title>
		<meta
			name="description"
			content="Maps rendered on the server by stillmap, each shown beside the JSX that produced it."
		/>
		<style>${STYLE}</style>
	</head>
	<body>
		<main>
			<header class="masthead">
				<h1>stillmap</h1>
				<p class="tagline">
					Describe a map as JSX, get back an SVG string or a PNG buffer. No
					browser, no canvas, no native map library, and no API key.
				</p>
				<p class="links">
					<a class="button primary" href="${escapeXml(sandboxUrl)}"
						>Run it in CodeSandbox</a
					>
					<a class="button" href="${REPO}">Source</a>
					<a class="button" href="https://www.npmjs.com/package/@stillmap/react"
						>npm</a
					>
				</p>
			</header>
${sections.map(section).join("\n")}
		</main>
		<footer>
			<p>
				Every map on this page is rendered fresh on each deploy from live
				<a href="https://openfreemap.org">OpenFreeMap</a> tiles. Map data from
				<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>.
			</p>
		</footer>
	</body>
</html>
`;
}
