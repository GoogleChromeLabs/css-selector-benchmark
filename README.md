# CSS Selector Benchmark

A suite of CSS Selector Benchmarks measuring style recalculation, invalidation, and selector matching performance across modern browser engines using Chromium’s `PerfTestRunner` and Puppeteer.

-   **GitHub Repository**: [https://github.com/GoogleChromeLabs/css-selector-benchmark](https://github.com/GoogleChromeLabs/css-selector-benchmark)
-   **Live Demo**: [https://chrome.dev/css-selector-benchmark](https://chrome.dev/css-selector-benchmark)

## Prerequisites

### Project Setup

Install dependencies:

```bash
npm i
```

Install browsers to test with:

```bash
npx puppeteer browsers install chrome
npx puppeteer browsers install firefox
```

### Start the Web Server

The benchmarks are HTML pages served by a local web server:

```bash
npm run start
```

The web server will start at `http://localhost:3000/` (or another available port).

---

## Running Benchmarks

Benchmarks can be run in two ways: **visually in the browser** or **headlessly via the CLI**.

### 1. Visually in the Browser

Open `http://localhost:3000/` (or visit [https://chrome.dev/css-selector-benchmark](https://chrome.dev/css-selector-benchmark)) to access the main suite index:

-   **Suite Index (`/`)**: Browse all available benchmarks with real-time search, category filters (`:has()`, `:nth-child()`, `@scope`, `At-Rules`, `Class & Attribute`, `Combinators`, etc.), and CLI command tips.
-   **Benchmark Runner Page**: Clicking any benchmark opens its visual facade runner:
    -   Click the **"Run Benchmark"** button to execute the test suite in an isolated iframe.
    -   Watch live status indicators update as each test runs.
    -   View pre-populated results tables with runs per second (`runs/s`) and relative performance comparison bars.
    -   Use the **"← Back to index"** pill link at the top to return to the suite overview.

> You can also run the benchmark directly via the DevTools Console on any benchmark page by calling `window.startTest().then(console.table);`.

### 2. Headlessly via the CLI

With the web server running, invoke any benchmark using the CLI:

```bash
npm run benchmark example
```

This runs the benchmark via Puppeteer in headless Chrome, logs progress, and outputs the collected results.

#### Choosing which browser to run the benchmarks in

Use the `--browser` option to select the browser engine:

```bash
npm run benchmark example -- --browser=firefox
```

Supported options:

-   `chrome` = Use Chrome (default)
    -   `chrome` = Chrome Stable
    -   `chrome-beta` = Chrome Beta
    -   `chrome-dev` = Chrome Dev
    -   `chrome-canary` = Chrome Canary
-   `firefox` = Use Firefox

A notice is printed displaying the active browser version:

```
ℹ️ Running benchmark using browser firefox (firefox/129.0a1)
```

### Reading the Results

When a benchmark completes, results are formatted as an array of objects:

```javascript
{
  scenario: '1 class',
  selector: '.btn',
  description: '1 Class: .btn',
  result: 6265.73,
  perc: '100.00%'
}
{
  scenario: '1 class',
  selector: '[class^="btn-"]',
  description: '1 Class: [class^="btn-"]',
  result: 659.47,
  perc: '10.53%'
}
```

-   `scenario`: The DOM scenario or test environment variation being evaluated.
-   `selector`: The CSS selector being tested.
-   `description`: A human-readable description of the specific test case.
-   `result`: The performance score measured in **runs per second** (`runs/s`). **Higher is better/faster.**
-   `perc`: Relative performance compared to the fastest test case in the benchmark (`(result / max) * 100`). The fastest result is normalized to `100.00%`.

---

## Creating a Benchmark

You can scaffold a new benchmark using the interactive creation script:

```bash
npm run create
```

Or pass the benchmark name directly (names with slashes are supported):

```bash
npm run create has/new
```

### What the script does:

1. **Collision check**: Ensures the benchmark name is not already taken; aborts with a warning if a collision is detected.
2. **Scaffolds `tests.html`**: The underlying benchmark test file equipped with all necessary boilerplate:
    - Chromium's `PerfTestRunner` integration (`measureRunsPerSecond`).
    - DOM tree creation helper (`makeTree`).
    - Dynamic stylesheet insertion and teardown using `adoptedStyleSheets` (`setCSS`, `resetCSS`).
    - Sample selectors dictionary.
    - `window.getTests()` and `window.startTest(onResult, onStart)` API hooks.
3. **Scaffolds `index.html`**: The visual runner facade with:
    - "← Back to index" navigation link.
    - Live runner iframe delegator and progress reporting.
    - Results table with performance bars.
4. **Registers with the Suite Index**: Automatically adds the new benchmark entry to the `BENCHMARKS` array in `src/index.html`.

Once created, you can immediately start editing `src/benchmarks/<name>/tests.html` to add your test selectors and run:

```bash
npm run benchmark <name>
```
