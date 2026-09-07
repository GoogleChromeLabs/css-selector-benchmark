/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let benchmarkName = process.argv[2];

if (!benchmarkName) {
	const rl = readline.createInterface({ input, output });
	benchmarkName = await rl.question('Enter benchmark name (e.g. has/new): ');
	rl.close();
}

benchmarkName = benchmarkName ? benchmarkName.trim().replace(/^\/+|\/+$/g, '') : '';

if (!benchmarkName) {
	console.error('❌ Error: Benchmark name cannot be empty.');
	process.exit(1);
}

const targetDir = path.resolve(rootDir, 'src', 'benchmarks', benchmarkName);

if (fs.existsSync(targetDir)) {
	console.warn(`⚠️ Warning: Benchmark "${benchmarkName}" already exists at src/benchmarks/${benchmarkName}. Aborting.`);
	process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

function formatTitle(name) {
	return name
		.split('/')
		.map((part) =>
			part
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' '),
		)
		.join(' - ');
}

function getCategory(name) {
	const first = name.split('/')[0].toLowerCase();
	if (first === 'has') return ':has()';
	if (first === 'nth-child-of-s' || first === 'nth-child') return ':nth-child()';
	if (first === 'scope') return '@scope';
	if (first === 'nesting') return 'Nesting';
	if (first === 'is') return 'Pseudo-classes';
	if (first === 'at-property' || first === 'at-rule') return 'At-Rules';
	if (first === 'cssom') return 'CSSOM';
	if (first === 'btn') return 'Class & Attribute';
	if (first === 'selectors') return 'Combinators';
	return formatTitle(first);
}

function serializeBenchmarks(benchmarks) {
	const items = benchmarks.map((b) => {
		return `\t\t\t\t{\n\t\t\t\t\tpath: '${b.path}',\n\t\t\t\t\tcli: '${b.cli}',\n\t\t\t\t\ttitle: '${b.title.replace(/'/g, "\\'")}',\n\t\t\t\t\tcategory: '${b.category.replace(/'/g, "\\'")}',\n\t\t\t\t\tdesc: '${b.desc.replace(/'/g, "\\'")}',\n\t\t\t\t\ttags: [${b.tags.map((t) => `'${t.replace(/'/g, "\\'")}'`).join(', ')}],\n\t\t\t\t}`;
	});
	return `[\n${items.join(',\n')},\n\t\t\t]`;
}

const displayTitle = formatTitle(benchmarkName);
const testRelPath = `${benchmarkName}/tests.html`;
const currentYear = new Date().getFullYear();

const testsHtmlContent = `<!doctype html>
<!--
 Copyright ${currentYear} Google LLC
 SPDX-License-Identifier: Apache-2.0
-->

<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Test - ${displayTitle}</title>
		<script type="module">
			import PerfTestRunner from '/lib/PerfTestRunner.js';
			import { createElement } from '/lib/DOM.js';

			const $container = document.querySelector('#container');

			function makeTree(parentEl, numSiblings) {
				for (let i = 0; i <= numSiblings; i++) {
					parentEl.appendChild(
						createElement('div', {
							className: \`item item-\${i}\`,
							innerHTML: \`<div class="child"><span class="label">Item \${i}</span></div>\`,
						}),
					);
				}
			}

			makeTree($container, 1000);
			$container.offsetHeight; // force recalc style

			function resetCSS() {
				document.adoptedStyleSheets = [];
			}
			function setCSS(css) {
				const stylesheet = new CSSStyleSheet();
				stylesheet.replaceSync(css);
				document.adoptedStyleSheets = [stylesheet];
			}

			const selectors = {
				'Baseline selector': '.item',
				'Deep selector': '.item .child .label',
			};

			const runTest = (description, selector) =>
				new Promise((resolve, reject) => {
					PerfTestRunner.measureRunsPerSecond({
						description: \`Selector Test \${description}\`,
						setup: () => {
							setCSS(\`\${selector} { color: red; }\`);
						},
						run: function () {
							$container.offsetHeight; // force recalc style
						},
						iterationCount: 5,
						teardown: resetCSS,
						done: resolve,
					});
				});

			const average = (array) => (Array.isArray(array) ? array.reduce((a, b) => a + b, 0) / array.length : array);

			window.getTests = () =>
				Object.entries(selectors).map(([description, selector]) => ({
					scenario: '${displayTitle}',
					description,
					selector,
				}));

			window.startTest = (onResult, onStart) =>
				new Promise(async (resolve) => {
					const allResults = [];
					for (const test of window.getTests()) {
						if (typeof onStart === 'function') {
							onStart(test);
						}
						const testResult = await runTest(test.description, test.selector);
						const avg = average(testResult);
						const item = {
							scenario: test.scenario,
							description: test.description,
							selector: test.selector,
							result: Math.round(avg * 100) / 100,
						};
						allResults.push(item);
						if (typeof onResult === 'function') {
							onResult(item);
						}
					}
					const max = Math.max(...allResults.map((r) => r.result), 1);
					resolve(
						allResults.map((r) => {
							r.perc = ((r.result / max) * 100).toFixed(2) + '%';
							return r;
						}),
					);
				});
		</script>
	</head>
	<body>
		<div id="container"></div>
	</body>
</html>
`;

const indexHtmlContent = `<!doctype html>
<!--
 Copyright ${currentYear} Google LLC
 SPDX-License-Identifier: Apache-2.0
-->

<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>CSS ${displayTitle} Benchmark</title>
		<style>
			:root {
				--bg: #f8fafc;
				--surface: #ffffff;
				--surface-subtle: #f1f5f9;
				--border: #e2e8f0;
				--border-dark: #cbd5e1;
				--text: #0f172a;
				--text-muted: #64748b;
				--accent: #2563eb;
				--accent-hover: #1d4ed8;
				--bar-fill: #2563eb;
				--code-bg: #f1f5f9;
			}

			* {
				box-sizing: border-box;
				margin: 0;
				padding: 0;
			}

			body {
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Helvetica,
					Arial,
					sans-serif;
				background-color: var(--bg);
				color: var(--text);
				padding: 2rem 1.5rem;
				line-height: 1.5;
			}

			.container {
				max-width: 1080px;
				margin: 0 auto;
			}

			.nav-back {
				margin-bottom: 1.25rem;
			}

			.btn-back {
				display: inline-flex;
				align-items: center;
				gap: 0.35rem;
				padding: 0.25rem 0.75rem;
				border-radius: 9999px;
				font-size: 0.8125rem;
				font-weight: 500;
				color: var(--accent);
				background: transparent;
				border: 1px solid var(--accent);
				text-decoration: none;
				transition:
					background-color 0.15s ease,
					color 0.15s ease,
					border-color 0.15s ease;
			}

			.btn-back:hover {
				background-color: var(--accent);
				color: #ffffff;
			}

			header {
				margin-bottom: 2rem;
				border-bottom: 1px solid var(--border);
				padding-bottom: 1.5rem;
			}

			h1 {
				font-size: 1.75rem;
				font-weight: 700;
				color: var(--text);
				margin-bottom: 0.5rem;
				letter-spacing: -0.02em;
			}

			p.lead {
				font-size: 1rem;
				color: var(--text-muted);
				margin-bottom: 1rem;
				line-height: 1.6;
			}

			.selector-chips {
				display: flex;
				flex-wrap: wrap;
				gap: 0.5rem;
				margin-top: 1rem;
			}

			.chip {
				display: inline-flex;
				align-items: center;
				padding: 0.25rem 0.65rem;
				border-radius: 4px;
				font-size: 0.8125rem;
				font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
				background: var(--surface);
				border: 1px solid var(--border-dark);
				color: var(--text);
			}

			.controls-card {
				background: var(--surface);
				border: 1px solid var(--border);
				border-radius: 8px;
				padding: 1.25rem;
				margin-bottom: 1.5rem;
				display: flex;
				flex-wrap: wrap;
				align-items: center;
				justify-content: space-between;
				gap: 1rem;
			}

			.control-group {
				display: flex;
				align-items: center;
				gap: 1rem;
			}

			button.btn-primary {
				background: var(--accent);
				color: #ffffff;
				border: 1px solid var(--accent);
				padding: 0.55rem 1.25rem;
				border-radius: 6px;
				font-weight: 500;
				font-size: 0.9375rem;
				cursor: pointer;
				transition:
					background-color 0.15s ease,
					border-color 0.15s ease;
			}

			button.btn-primary:hover {
				background: var(--accent-hover);
				border-color: var(--accent-hover);
			}

			button.btn-primary:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			.status-text {
				font-size: 0.875rem;
				color: var(--text-muted);
				font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			}

			.results-card {
				background: var(--surface);
				border: 1px solid var(--border);
				border-radius: 8px;
				padding: 1.25rem;
				margin-bottom: 1.5rem;
				overflow-x: auto;
			}

			.results-card h2,
			.card h2 {
				font-size: 1.125rem;
				font-weight: 600;
				margin-bottom: 1rem;
				color: var(--text);
			}

			table {
				width: 100%;
				border-collapse: collapse;
				font-size: 0.875rem;
				text-align: left;
			}

			th,
			td {
				padding: 0.75rem 1rem;
				border-bottom: 1px solid var(--border);
			}

			th {
				background: var(--surface-subtle);
				color: var(--text-muted);
				font-weight: 600;
				text-transform: uppercase;
				font-size: 0.75rem;
				letter-spacing: 0.05em;
			}

			tbody tr:last-child td {
				border-bottom: none;
			}

			tbody tr:hover {
				background: var(--surface-subtle);
			}

			.code-tag {
				font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
				font-size: 0.8125rem;
				background: var(--code-bg);
				padding: 0.15rem 0.4rem;
				border-radius: 4px;
				border: 1px solid var(--border);
				color: var(--text);
			}

			.bar-container {
				display: flex;
				align-items: center;
				gap: 0.75rem;
				width: 100%;
				min-width: 140px;
			}

			.bar-track {
				flex: 1;
				background: var(--border);
				height: 8px;
				border-radius: 9999px;
				overflow: hidden;
			}

			.bar-fill {
				background: var(--bar-fill);
				height: 100%;
				border-radius: 9999px;
				transition: width 0.3s ease;
			}

			.bar-pct {
				font-size: 0.75rem;
				color: var(--text-muted);
				font-variant-numeric: tabular-nums;
				width: 48px;
				text-align: right;
			}

			.card {
				background: var(--surface);
				border: 1px solid var(--border);
				border-radius: 8px;
				padding: 1.25rem;
				margin-bottom: 1.5rem;
			}

			ul.tests-list {
				list-style: none;
				display: grid;
				grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
				gap: 0.75rem;
			}

			ul.tests-list li a {
				display: flex;
				flex-direction: column;
				gap: 0.25rem;
				padding: 0.75rem 1rem;
				background: var(--surface-subtle);
				border: 1px solid var(--border);
				border-radius: 6px;
				color: var(--accent);
				text-decoration: none;
				transition:
					border-color 0.15s ease,
					background-color 0.15s ease;
			}

			ul.tests-list li a:hover {
				border-color: var(--accent);
				background: var(--surface);
			}

			ul.tests-list li a strong {
				font-size: 0.875rem;
				font-weight: 600;
			}

			ul.tests-list li a span {
				font-size: 0.75rem;
				color: var(--text-muted);
			}

			.info-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
				gap: 1.5rem;
				margin-bottom: 2rem;
			}

			.info-card {
				background: var(--surface);
				border: 1px solid var(--border);
				border-radius: 8px;
				padding: 1.25rem;
			}

			.info-card h3 {
				font-size: 1rem;
				font-weight: 600;
				margin-bottom: 0.5rem;
				color: var(--text);
			}

			.info-card p {
				font-size: 0.875rem;
				color: var(--text-muted);
				line-height: 1.5;
			}
		</style>

		<script type="module">
			const TEST_FILES = [
				{
					file: '${testRelPath}',
					title: 'tests.html',
					label: '${displayTitle}',
					desc: 'Benchmark tests in tests.html',
				},
			];
			window.TEST_FILES = TEST_FILES;

			let runnerIframe = null;
			function getOrCreateRunnerIframe() {
				if (!runnerIframe) {
					runnerIframe = document.createElement('iframe');
					runnerIframe.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1024px; height: 768px; opacity: 0; pointer-events: none; border: 0;';
					document.body.appendChild(runnerIframe);
				}
				return runnerIframe;
			}

			function loadIframe(file) {
				return new Promise((resolve, reject) => {
					const dirPath = window.location.pathname.endsWith('.html')
						? window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1)
						: window.location.pathname.endsWith('/')
							? window.location.pathname
							: window.location.pathname + '/';
					const filename = file.includes('/') ? file.substring(file.lastIndexOf('/') + 1) : file;
					const fullUrl = new URL(filename + '?t=' + Date.now(), window.location.origin + dirPath).href;
					const iframe = getOrCreateRunnerIframe();

					const handleLoad = () => {
						iframe.removeEventListener('load', handleLoad);
						iframe.removeEventListener('error', handleError);
						resolve(iframe);
					};

					const handleError = (err) => {
						iframe.removeEventListener('load', handleLoad);
						iframe.removeEventListener('error', handleError);
						reject(err);
					};

					iframe.addEventListener('load', handleLoad);
					iframe.addEventListener('error', handleError);
					iframe.src = fullUrl;
				});
			}

			async function getTestsFromIframe(file) {
				const iframe = await loadIframe(file);
				if (typeof iframe.contentWindow.getTests === 'function') {
					return iframe.contentWindow.getTests();
				}
				return [];
			}

			let allResults = [];

			function renderTestsList() {
				const listEl = document.getElementById('tests-list');
				if (!listEl) return;

				listEl.innerHTML = '';
				TEST_FILES.forEach((testFile) => {
					const li = document.createElement('li');
					const countInfo = typeof testFile.testCount === 'number' ? \` (\${testFile.testCount} tests)\` : '';
					const filename = testFile.file.includes('/') ? testFile.file.substring(testFile.file.lastIndexOf('/') + 1) : testFile.file;
					const folder = window.location.pathname.replace(/\\/$/, '').split('/').pop();
					const href = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('.html') ? filename : \`\${folder}/\${filename}\`;
					li.innerHTML = \`
						<a href="\${href}">
							<strong>\${testFile.title}</strong>
							<span>\${testFile.desc}\${countInfo}</span>
						</a>
					\`;
					listEl.appendChild(li);
				});
			}

			function renderTable() {
				const tbody = document.getElementById('results-body');
				if (!tbody) return;

				if (!allResults || allResults.length === 0) {
					tbody.innerHTML = \`
						<tr>
							<td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem">Discovering benchmark tests from files…</td>
						</tr>
					\`;
					return;
				}

				tbody.innerHTML = '';
				const completedResults = allResults.filter((r) => r.status === 'completed' && typeof r.result === 'number');
				const max = completedResults.length > 0 ? Math.max(...completedResults.map((r) => r.result), 1) : 1;

				allResults.forEach((item) => {
					const tr = document.createElement('tr');

					let runsPerSecHtml = '';
					let barHtml = '';

					if (item.status === 'completed' && typeof item.result === 'number') {
						const pct = (item.result / max) * 100;
						runsPerSecHtml = \`<strong>\${Math.round(item.result).toLocaleString()}</strong> <span class="unit">runs/s</span>\`;
						barHtml = \`
							<div class="bar-container">
								<div class="bar-track">
									<div class="bar-fill" style="width: \${pct}%"></div>
								</div>
								<span class="bar-pct">\${pct.toFixed(1)}%</span>
							</div>
						\`;
					} else if (item.status === 'running') {
						runsPerSecHtml = \`<span style="color: var(--accent); font-weight: 500;">Running…</span>\`;
						barHtml = \`
							<div class="bar-container">
								<div class="bar-track">
									<div class="bar-fill" style="width: 100%; animation: pulse 1s infinite;"></div>
								</div>
								<span class="bar-pct" style="color: var(--accent)">…</span>
							</div>
						\`;
					} else {
						runsPerSecHtml = \`<span style="color: var(--text-muted)">Pending…</span>\`;
						barHtml = \`
							<div class="bar-container">
								<div class="bar-track">
									<div class="bar-fill" style="width: 0%"></div>
								</div>
								<span class="bar-pct">—</span>
							</div>
						\`;
					}

					tr.innerHTML = \`
						<td><strong>\${item.scenario}</strong></td>
						<td><code class="code-tag">\${item.selector || item.css || '—'}</code></td>
						<td>\${item.description}</td>
						<td>\${runsPerSecHtml}</td>
						<td>\${barHtml}</td>
					\`;
					tbody.appendChild(tr);
				});
			}

			async function discoverTests() {
				const statusEl = document.getElementById('status');
				if (statusEl) {
					statusEl.textContent = 'Discovering benchmark tests from files…';
				}

				for (const testFile of TEST_FILES) {
					const tests = await getTestsFromIframe(testFile.file);
					testFile.tests = tests;
					testFile.testCount = tests.length;
				}

				allResults = [];
				for (const testFile of TEST_FILES) {
					for (const test of testFile.tests) {
						allResults.push({
							scenario: test.scenario || testFile.label,
							selector: test.selector || test.css,
							description: test.description,
							status: 'pending',
							result: null,
						});
					}
				}

				renderTestsList();
				renderTable();

				const totalTests = allResults.length;
				if (statusEl) {
					statusEl.textContent = \`Ready to run \${totalTests} tests across \${TEST_FILES.length} files (or invoke window.startTest() in console)\`;
				}
				const btnRun = document.getElementById('btn-run');
				if (btnRun) {
					btnRun.textContent = \`Run Benchmark (\${totalTests} tests)\`;
				}
			}

			const discoveryPromise = discoverTests();

			window.startTest = async () => {
				await discoveryPromise;

				const statusEl = document.getElementById('status');
				const btnRun = document.getElementById('btn-run');
				if (btnRun) btnRun.disabled = true;

				allResults.forEach((item) => {
					item.status = 'pending';
					item.result = null;
				});
				renderTable();

				const totalTests = allResults.length;
				let completedCount = 0;

				for (let i = 0; i < TEST_FILES.length; i++) {
					const fileConfig = TEST_FILES[i];
					if (statusEl) {
						statusEl.textContent = \`Loading (\${i + 1}/\${TEST_FILES.length}): \${fileConfig.title}…\`;
					}

					try {
						const iframe = await loadIframe(fileConfig.file);
						if (typeof iframe.contentWindow.startTest !== 'function') {
							throw new Error(\`window.startTest is not defined in \${fileConfig.file}\`);
						}
						await iframe.contentWindow.startTest(
							(liveItem) => {
								completedCount++;
								const target = allResults.find((r) => r.description === liveItem.description);
								if (target) {
									target.status = 'completed';
									target.result = liveItem.result;
								}
								if (statusEl) {
									statusEl.textContent = \`Completed (\${completedCount}/\${totalTests}): \${liveItem.description}…\`;
								}
								renderTable();
							},
							(startItem) => {
								allResults.forEach((item) => {
									if (item.description === startItem.description) {
										item.status = 'running';
									} else if (item.status === 'running') {
										item.status = 'pending';
									}
								});
								if (statusEl) {
									statusEl.textContent = \`Running (\${completedCount + 1}/\${totalTests}): \${startItem.description}…\`;
								}
								renderTable();
							},
						);
					} catch (err) {
						console.error(\`Error running \${fileConfig.file}:\`, err);
					}
				}

				const max = Math.max(...allResults.map((r) => r.result || 0), 1);
				const formattedResults = allResults.map((r) => ({
					scenario: r.scenario,
					selector: r.selector,
					description: r.description,
					result: Math.round((r.result || 0) * 100) / 100,
					perc: (((r.result || 0) / max) * 100).toFixed(2) + '%',
				}));

				if (statusEl) {
					statusEl.textContent = \`Benchmark completed (\${formattedResults.length} tests run)\`;
				}
				if (btnRun) btnRun.disabled = false;

				return formattedResults;
			};

			function init() {
				renderTestsList();
				renderTable();

				const btnRun = document.getElementById('btn-run');
				if (btnRun) {
					btnRun.addEventListener('click', () => {
						window.startTest().then((res) => {
							console.table(res);
						});
					});
				}
			}

			if (document.readyState === 'loading') {
				window.addEventListener('DOMContentLoaded', init);
			} else {
				init();
			}
		</script>
	</head>

	<body>
		<div class="container">
			<nav class="nav-back">
				<a href="/" class="btn-back">&larr; Back to index</a>
			</nav>
			<header>
				<h1>CSS ${displayTitle} Benchmark</h1>
				<p class="lead">Benchmark measuring style recalculation performance for ${displayTitle}.</p>
				<div class="selector-chips">
					<span class="chip">.item</span>
					<span class="chip">.item .child .label</span>
				</div>
			</header>

			<div class="controls-card">
				<div class="control-group">
					<button type="button" id="btn-run" class="btn-primary">Run Benchmark</button>
					<span id="status" class="status-text">Discovering benchmark tests from files…</span>
				</div>
			</div>

			<div class="results-card">
				<h2>Benchmark Results</h2>
				<table>
					<thead>
						<tr>
							<th>Scenario</th>
							<th>Selector</th>
							<th>Description</th>
							<th>Runs / Second</th>
							<th>Relative Performance</th>
						</tr>
					</thead>
					<tbody id="results-body">
						<tr>
							<td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem">Discovering benchmark tests from files…</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div class="card">
				<h2>Tests in this Folder</h2>
				<ul class="tests-list" id="tests-list"></ul>
			</div>

			<div class="info-grid">
				<div class="info-card">
					<h3>What is being tested?</h3>
					<p>Benchmarks style recalculation performance for ${displayTitle}.</p>
				</div>
			</div>
		</div>
	</body>
</html>
`;

fs.writeFileSync(path.join(targetDir, 'index.html'), indexHtmlContent, 'utf-8');
fs.writeFileSync(path.join(targetDir, 'tests.html'), testsHtmlContent, 'utf-8');

// Update BENCHMARKS array in src/index.html
const mainIndexPath = path.resolve(rootDir, 'src', 'index.html');
if (fs.existsSync(mainIndexPath)) {
	const mainIndexContent = fs.readFileSync(mainIndexPath, 'utf-8');
	const benchmarksMatch = mainIndexContent.match(/const BENCHMARKS = (\[[\s\S]*?\n\t\t\t\]);/);
	if (benchmarksMatch) {
		try {
			const benchmarks = eval(benchmarksMatch[1]);
			const newEntry = {
				path: `benchmarks/${benchmarkName}/`,
				cli: benchmarkName,
				title: displayTitle.toLowerCase().startsWith('css') ? displayTitle : `CSS ${displayTitle}`,
				category: getCategory(benchmarkName),
				desc: `Benchmark measuring style recalculation performance for ${displayTitle}.`,
				tags: [benchmarkName.split('/').pop(), 'recalc', 'benchmark'],
			};

			const existingIndex = benchmarks.findIndex((b) => b.cli === benchmarkName);
			if (existingIndex >= 0) {
				benchmarks[existingIndex] = newEntry;
			} else {
				benchmarks.push(newEntry);
			}

			benchmarks.sort((a, b) => a.cli.localeCompare(b.cli));

			const serialized = serializeBenchmarks(benchmarks);
			const updatedMainIndexContent = mainIndexContent.replace(benchmarksMatch[1], serialized);
			fs.writeFileSync(mainIndexPath, updatedMainIndexContent, 'utf-8');
		} catch (err) {
			console.error('⚠️ Could not update BENCHMARKS array in src/index.html:', err.message);
		}
	}
}

console.log(`✅ Created benchmark at src/benchmarks/${benchmarkName}`);
console.log(`  - src/benchmarks/${benchmarkName}/index.html`);
console.log(`  - src/benchmarks/${benchmarkName}/tests.html`);
console.log(`  - Updated src/index.html (BENCHMARKS array)`);
console.log(`\nTo run this benchmark:`);
console.log(`  npm run benchmark ${benchmarkName}`);
