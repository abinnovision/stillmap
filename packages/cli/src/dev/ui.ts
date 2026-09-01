/**
 * The preview shell: one document, no framework, no build step for the browser.
 * The rendered map is an SVG string, so the client only has to fetch it and put
 * it on the page.
 */
export const SHELL = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>stillmap</title>
<style>
:root {
	color-scheme: light dark;
	--bg: #ffffff;
	--panel: #f6f6f7;
	--border: #e2e2e5;
	--text: #1a1a1c;
	--muted: #6b6b73;
	--accent: #1f6feb;
	--warn-bg: #fff8e6;
	--warn-border: #e8d08a;
	--error-bg: #fff1f0;
	--error-border: #e8a5a0;
}
@media (prefers-color-scheme: dark) {
	:root {
		--bg: #17171a;
		--panel: #1e1e22;
		--border: #2e2e34;
		--text: #e8e8ea;
		--muted: #9a9aa4;
		--accent: #6ea8fe;
		--warn-bg: #2a2412;
		--warn-border: #5c4d1e;
		--error-bg: #2a1616;
		--error-border: #5c2a26;
	}
}
* { box-sizing: border-box; }
body {
	margin: 0;
	display: grid;
	grid-template-columns: 260px 1fr;
	height: 100vh;
	background: var(--bg);
	color: var(--text);
	font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
aside {
	border-right: 1px solid var(--border);
	background: var(--panel);
	display: flex;
	flex-direction: column;
	min-height: 0;
}
aside h1 {
	margin: 0;
	padding: 16px;
	font-size: 13px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--muted);
	border-bottom: 1px solid var(--border);
}
#list { overflow-y: auto; padding: 8px; }
.item {
	display: block;
	width: 100%;
	text-align: left;
	padding: 7px 10px;
	border: 0;
	border-radius: 6px;
	background: transparent;
	color: inherit;
	font: inherit;
	cursor: pointer;
	word-break: break-all;
}
.item:hover { background: var(--border); }
.item.active { background: var(--accent); color: #fff; }
#formats { margin-left: auto; display: flex; gap: 2px; }
.format {
	border: 1px solid var(--border);
	background: var(--panel);
	color: var(--muted);
	font: inherit;
	font-size: 12px;
	padding: 2px 9px;
	cursor: pointer;
}
.format:first-child { border-radius: 5px 0 0 5px; }
.format:last-child { border-radius: 0 5px 5px 0; }
.format.active { background: var(--accent); border-color: var(--accent); color: #fff; }
main {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}
header {
	display: flex;
	gap: 16px;
	align-items: baseline;
	flex-wrap: wrap;
	padding: 12px 20px;
	border-bottom: 1px solid var(--border);
	color: var(--muted);
	font-size: 12px;
	font-variant-numeric: tabular-nums;
}
header strong { color: var(--text); font-size: 14px; font-weight: 600; }
#stage {
	flex: 1;
	overflow: auto;
	padding: 24px;
	display: flex;
	align-items: flex-start;
	justify-content: center;
}
#stage svg,
#stage img {
	max-width: 100%;
	height: auto;
	border: 1px solid var(--border);
	border-radius: 8px;
	box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
}
.empty { color: var(--muted); margin-top: 48px; }
#warnings { border-top: 1px solid var(--border); max-height: 32vh; overflow-y: auto; }
#warnings:empty { display: none; }
.note {
	padding: 10px 20px;
	border-bottom: 1px solid var(--border);
	background: var(--warn-bg);
	font-size: 13px;
}
.note.error { background: var(--error-bg); }
.note.info { background: var(--panel); }
.note code {
	font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
	margin-right: 8px;
	opacity: 0.8;
}
.note .hint { color: var(--muted); display: block; margin-top: 2px; }
.note pre {
	margin: 8px 0 0;
	overflow-x: auto;
	font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
	color: var(--muted);
}
</style>
</head>
<body>
<aside>
	<h1>stillmap</h1>
	<div id="list"></div>
</aside>
<main>
	<header>
		<strong id="name">&nbsp;</strong><span id="meta"></span>
		<span id="formats">
			<button class="format active" data-format="png" type="button">PNG</button>
			<button class="format" data-format="svg" type="button">SVG</button>
		</span>
	</header>
	<div id="stage"></div>
	<div id="warnings"></div>
</main>
<script>
(function () {
	var list = document.getElementById('list');
	var stage = document.getElementById('stage');
	var name = document.getElementById('name');
	var meta = document.getElementById('meta');
	var notes = document.getElementById('warnings');
	var current = null;
	var format = 'png';

	function text(tag, value, className) {
		var node = document.createElement(tag);
		node.textContent = value;
		if (className) { node.className = className; }
		return node;
	}

	function note(kind, code, message, hint, stack) {
		var box = document.createElement('div');
		box.className = kind === 'error' ? 'note error' : 'note';
		box.appendChild(text('code', code));
		box.appendChild(document.createTextNode(message));
		if (hint) { box.appendChild(text('span', hint, 'hint')); }
		if (stack) { box.appendChild(text('pre', stack)); }
		return box;
	}

	function select(id) {
		current = id;
		if (id !== null) { location.hash = id; }
		for (var i = 0; i < list.children.length; i += 1) {
			var item = list.children[i];
			item.classList.toggle('active', item.dataset.id === id);
		}
		draw();
	}

	function show(data) {
		if (data.output.kind === 'svg') {
			stage.innerHTML = data.output.svg;
			return;
		}
		var img = document.createElement('img');
		img.src = data.output.image;
		img.width = data.width;
		img.height = data.height;
		img.alt = current;
		stage.replaceChildren(img);
	}

	function draw() {
		notes.replaceChildren();
		if (current === null) {
			name.textContent = 'No templates';
			meta.textContent = '';
			stage.replaceChildren(text('p', 'Nothing to preview yet.', 'empty'));
			return;
		}
		name.textContent = current;
		meta.textContent = 'rendering...';
		var wanted = current;
		fetch('/api/render/' + encodeURIComponent(current) + '?format=' + format)
			.then(function (response) { return response.json(); })
			.then(function (data) {
				if (wanted !== current) { return; }
				if (data.kind === 'error') {
					meta.textContent = 'failed';
					stage.replaceChildren();
					notes.appendChild(
						note('error', data.code, data.message, data.hint, data.stack)
					);
					return;
				}
				meta.textContent = [
					data.width + ' x ' + data.height + ' px',
					data.viewport.center[0].toFixed(4) + ', ' +
						data.viewport.center[1].toFixed(4),
					'z' + data.viewport.zoom.toFixed(2),
					data.durationMs + ' ms'
				].join('  \u00b7  ');
				show(data);
				if (data.note) {
					notes.appendChild(note('info', 'NOTE', data.note));
				}
				data.warnings.forEach(function (warning) {
					notes.appendChild(note('warn', warning.code, warning.message));
				});
			})
			.catch(function (error) {
				meta.textContent = 'unreachable';
				stage.replaceChildren(text('p', String(error), 'empty'));
			});
	}

	function refresh() {
		return fetch('/api/templates')
			.then(function (response) { return response.json(); })
			.then(function (data) {
				list.replaceChildren();
				data.templates.forEach(function (template) {
					var item = text('button', template.id, 'item');
					item.dataset.id = template.id;
					item.addEventListener('click', function () { select(template.id); });
					list.appendChild(item);
				});
				var ids = data.templates.map(function (t) { return t.id; });
				var hash = decodeURIComponent(location.hash.slice(1));
				var next = ids.indexOf(current) >= 0 ? current
					: ids.indexOf(hash) >= 0 ? hash
					: ids.length > 0 ? ids[0] : null;
				select(next);
			});
	}

	Array.prototype.forEach.call(
		document.querySelectorAll('.format'),
		function (button) {
			button.addEventListener('click', function () {
				format = button.dataset.format;
				Array.prototype.forEach.call(
					document.querySelectorAll('.format'),
					function (other) {
						other.classList.toggle('active', other === button);
					}
				);
				draw();
			});
		}
	);

	new EventSource('/events').addEventListener('reload', function () {
		refresh();
	});

	refresh();
})();
</script>
</body>
</html>
`;
