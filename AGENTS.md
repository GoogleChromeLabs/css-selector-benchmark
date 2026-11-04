# AGENTS.md

This file provides guidance for AI coding agents working in the **CSS Selector Benchmark** repository (`GoogleChromeLabs/css-selector-benchmark`).

---

## 1. Project Overview & Architecture

This repository hosts a suite of browser performance benchmarks measuring CSS selector matching, style invalidation, style recalculation, CSSOM, and DOM/Shadow DOM encapsulation costs using Chromium’s `PerfTestRunner` and Puppeteer.

- **Zero-build static source (`src/`)**: All files under `src/` are served directly as static HTML and native ES modules without a bundler.
- **Suite Index (`src/index.html`)**: The main landing page at `/`. It renders a filterable, searchable grid of all benchmarks from the `BENCHMARKS` array defined inline in `src/index.html`.
- **Shared Libraries (`src/lib/`)**:
    - `src/lib/PerfTestRunner.js`: Port of Chromium Blink’s `perf_tests/resources/runner.js` providing deterministic `Math.random`, statistical helpers, and `PerfTestRunner.measureRunsPerSecond()`.
    - `src/lib/DOM.js`: Lightweight `createElement(tagName, options)` helper for constructing DOM fixtures.
- **Individual Benchmarks (`src/benchmarks/<name>/`)**: Each benchmark lives in its own folder (supporting nested paths like `has/general` or `light-vs-shadow/mount`) and uses a **two-layer architecture**:
    1. **Visual Runner Facade (`index.html`)**: Provides the user-facing UI (header, description, "Run Benchmark" button, live progress status, results table with relative performance bars, and explanatory cards). It discovers and executes tests inside a hidden `<iframe>` so benchmark DOM/CSS mutations never pollute the runner UI.
    2. **Isolated Test Harness (`tests.html`, or multiple `<scenario>.html` files)**: Contains the actual DOM fixture, stylesheet setup/teardown, and `PerfTestRunner.measureRunsPerSecond()` calls.
- **CLI Tools (`cli/`)**:
    - `cli/create.js` (`npm run create <name>`): Scaffolds a new benchmark directory (`index.html` + `tests.html`) and registers it in `src/index.html`.
    - `cli/index.js` (`npm run benchmark <name>`): Launches headless Chrome or Firefox via Puppeteer, navigates to `http://localhost:3000/benchmarks/<name>`, calls `await window.startTest()`, and prints the results.
    - `cli/build.js` (`npm run build`): Copies `src/` into `build/` for production deployment.

---

## 2. Creating a New Benchmark

### Step 1: Scaffold via the CLI

Always prefer scaffolding new benchmarks with the built-in generator rather than copying files manually:

```bash
npm run create <benchmark-name>
# Examples:
npm run create attr-case-sensitivity
npm run create has/child-combinator
```

What `npm run create` does automatically:

1. Checks that `src/benchmarks/<benchmark-name>` does not already exist.
2. Computes the correct relative path depth (`../../lib/...` vs `../../../lib/...`) based on the number of `/` segments in `<benchmark-name>`.
3. Generates `src/benchmarks/<benchmark-name>/tests.html` and `src/benchmarks/<benchmark-name>/index.html`.
4. Inserts and alphabetically sorts a new entry in the `BENCHMARKS` array inside `src/index.html`.

### Step 2: Decide on Folder Structure (Single Suite vs. Subfolders)

In every benchmark table, the fastest test case in a run is normalized to **`100.00%`**, and all other rows display a relative percentage bar (`(result / max) * 100`).

- **Single Benchmark Folder (`src/benchmarks/<name>/`)**: Use a single folder (with one `tests.html` or multiple scenario `.html` files in `TEST_FILES`) when all test rows measure comparable operations that belong on the **same relative scale** (e.g., comparing 5 different CSS selectors against the same DOM tree).
- **Separate Subfolders (`src/benchmarks/<topic>/<scenario>/`)**: When a benchmark topic covers **fundamentally different workloads** that should **not** be compared against each other on a single 100% scale (for example, `light-vs-shadow/mount/`, `light-vs-shadow/host-recalc/`, `light-vs-shadow/outer-invalidation/`, and `light-vs-shadow/instance-scaling/`), create a dedicated subfolder for each workload so each has its own standalone runner and relative comparison bars.

### Step 3: Implement the Test Harness Contract (`tests.html`)

Every test file loaded by `index.html` (via `TEST_FILES`) **must** expose two functions on `window`:

1. **`window.getTests()`** _(Synchronous)_
   Returns an array of test metadata objects so `index.html` can pre-populate the results table on page load before the user clicks "Run Benchmark":

    ```js
    window.getTests = () => [
    	{
    		scenario: '1,000 Siblings',
    		description: 'Child combinator',
    		selector: '.parent > .child',
    	},
    ];
    ```

2. **`window.startTest(onResult, onStart)`** _(Asynchronous — returns a `Promise`)_
   Executes each test sequentially using `PerfTestRunner.measureRunsPerSecond()`, invoking the optional `onStart(test)` and `onResult(item)` callbacks so the parent `index.html` can render live status updates:
    ```js
    window.startTest = (onResult, onStart) =>
    	new Promise(async (resolve) => {
    		const allResults = [];
    		for (const test of window.getTests()) {
    			if (typeof onStart === 'function') {
    				onStart(test);
    			}
    			const testResult = await runTest(test);
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
    ```

### Step 4: Update `index.html` and `src/index.html` Metadata

1. In `src/benchmarks/<name>/index.html`:
    - Update `<title>`, `<h1>`, and `<p class="lead">` to clearly describe the benchmark.
    - Update `.selector-chips` with representative selectors or concepts tested.
    - Populate `.info-grid` (`.info-card` blocks) at the bottom of the page to explain **what is being tested**, **how the DOM fixture is structured**, and **key engine takeaways**.
    - If using multiple `.html` test files in the same folder, list all of them in the `TEST_FILES` array in `index.html`.
2. In `src/index.html`:
    - Verify the entry in `const BENCHMARKS = [...]` has a clear `title`, an appropriate `category` (matching existing categories like `:has()`, `:nth-child()`, `@scope`, `At-Rules`, `Class & Attribute`, `Combinators`, `CSSOM`, `Frameworks`, `Nesting`, `Pseudo-classes`, `Shadow DOM`, or `Reference` when applicable), a concise `desc`, and relevant `tags`.

---

## 3. Benchmarking Methodology & Best Practices

### Isolating Style Recalculation vs. Layout (Reflow)

Be intentional about what pipeline phase your benchmark triggers:

- **Pure Style Recalculation (No Layout)**:
    - Mutate **non-layout CSS properties** (such as `color`, `background-color`, `outline-color`, or custom properties) rather than geometry properties (`width`, `height`, `padding`, `margin`, `display`, `top`, `left`).
    - Force style recalculation by reading `window.getComputedStyle(probeElement).color` instead of layout-triggering getters like `element.offsetHeight`, `offsetWidth`, or `getBoundingClientRect()`.
- **Combined Style + Layout**:
    - Only read `$container.offsetHeight` when all compared selectors apply identical rules to the exact same DOM tree (typical of simple selector-matching benchmarks) or when layout cost is explicitly part of what is being measured.

### Avoiding Cached No-Ops in `PerfTestRunner.measureRunsPerSecond()`

`PerfTestRunner.measureRunsPerSecond({ setup, run, teardown, iterationCount, done })` calls `run()` many times inside a tight timing loop per iteration:

- If `setup()` applies the stylesheet once and `run()` only reads `getComputedStyle(el).color` or `$container.offsetHeight` without dirtying styles inside `run()`, **only the first call in each iteration will recalculate styles** and subsequent calls in the loop will be cached no-ops!
- **Ensure every call to `run()` performs real work**:
    - For **invalidation / state toggle benchmarks**: toggle a class or attribute inside `run()` (or alternate between two states on each call) and immediately flush styles (`window.getComputedStyle(probe).color`).
    - For **selector matching / full recalc benchmarks**: either apply/replace the stylesheet or toggle a root matching class inside `run()` before flushing styles.

### Stylesheet Management

- Prefer `document.adoptedStyleSheets` (or `shadowRoot.adoptedStyleSheets`) with a `CSSStyleSheet` instance (`sheet.replaceSync(css)`) for fast, leak-free stylesheet swapping and teardown (`document.adoptedStyleSheets = []`).
- Only create/append `<style>` elements inside the loop if the benchmark specifically measures `<style>` element cloning or parsing overhead.

### HTML Escaping & Visual Diagrams

- **Always escape HTML entities (`escapeHTML()`)** when rendering test names, descriptions, or selectors into HTML strings (`innerHTML`). Test descriptions and selectors frequently contain raw tag names like `<style>`, `<slot>`, `<div>`, or `<span>`—if unescaped, the browser parser will interpret them as actual HTML tags and break the table or card text.
- **DOM Topology Diagrams**: When illustrating complex DOM or Shadow DOM structures (such as in `src/benchmarks/light-vs-shadow/diagrams.js`), use `<mermaid-element>` with top-down tree diagrams (`flowchart TD`) and a centered modal `<dialog>` lightbox:
    - Keep diagrams focused purely on the DOM structure (avoid wordy inline commentary banners inside the graph).
    - Represent Shadow DOM boundaries using a dashed `subgraph` box around `#shadow-root` and its shadow children.
    - Escape `<` and `>` as `&lt;` and `&gt;` inside Mermaid node labels.

---

## 4. Running, Testing & Formatting Commands

### Start the Local Server

The web server **must** be running on `http://localhost:3000` before running benchmarks via the CLI or browser:

```bash
npm run start
```

### Run a Benchmark via CLI (Puppeteer)

With `npm run start` running in another terminal or background task:

```bash
# Run in default Chrome Stable (headless)
npm run benchmark <benchmark-name>

# Examples:
npm run benchmark example
npm run benchmark light-vs-shadow/mount

# Run in a specific browser or channel:
npm run benchmark <benchmark-name> -- --browser=chrome-canary
npm run benchmark <benchmark-name> -- --browser=chrome-dev
npm run benchmark <benchmark-name> -- --browser=chrome-beta
npm run benchmark <benchmark-name> -- --browser=firefox
```

### Code Formatting & Linting

This project uses **Prettier** and **EditorConfig** (`indent_style = tab`, `indent_size = 4`, single quotes, `max_line_length = 200`). Always format your code before finishing a task:

```bash
# Check formatting
npm run lint

# Auto-format all files in src/, test/, and cli/
npm run format
```

### Production Build

```bash
npm run build
```

---

## 5. Checklist for Agents Adding or Updating a Benchmark

1. **License Header**: Every `.html` and `.js` file must start with the Google LLC `Apache-2.0` license header:
    - HTML:
        ```html
        <!doctype html>
        <!--
         Copyright 2026 Google LLC
         SPDX-License-Identifier: Apache-2.0
        -->
        ```
    - JS:
        ```js
        /**
         * Copyright 2026 Google LLC
         * SPDX-License-Identifier: Apache-2.0
         */
        ```
2. **Suite Index Registration**: Ensure the benchmark is listed in `BENCHMARKS` inside `src/index.html` and sorted alphabetically by `cli`.
3. **HTML Escaping**: Verify all dynamic strings rendered into `index.html` tables, cards, or diagrams pass through `escapeHTML()`.
4. **Live Verification**: Run `npm run benchmark <benchmark-name>` against the local server to confirm that `window.getTests()` and `window.startTest()` complete without console errors or `PageError` exceptions.
5. **Formatting**: Run `npm run format` and `npm run lint` to ensure full compliance with Prettier rules.
