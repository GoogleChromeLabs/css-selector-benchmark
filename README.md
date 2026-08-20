# CSS Selector Benchmark

CSS Selector Benchmarks, using PerfTestRunner and Puppeteer

## Prerequisites

### Project Setup

Install dependencies

```bash
npm i
```

Install browsers to test with

```bash
npx puppeteer browsers install chrome
npx puppeteer browsers install firefox
```

### Start the web server

The benchmarks are HTML pages which need to be served by a web server

```bash
npm run start
```

The Web Server is now running at http://localhost:3000/

## Running a benchmark

With the Web Server running, invoke a benchmark on the CLI:

```bash
npm run benchmark example
```

This will run the benchmark served by `http://localhost:3000/benchmarks/example/`, whose source is located at `./src/benchmarks/example/index.html`

Note: You can also run benchmarks directly in a browser. To do so, visit its URL and invoke `window.startTest().then(console.table);` on the Console.

### Choosing which browser to run the benchmarks in

To select which browser to test things in, use the `--browser` option.

```bash
npm run benchmark example -- --browser=firefox
```

Supported options:

- `chrome` = Use Chrome
  - `chrome` = Use Chrome Stable
  - `chrome-beta` = Use Chrome Beta
  - `chrome-dev` = Use Chrome Dev
  - `chrome-canary` = Use Chrome Canary
- `firefox`= Use Firefox

The default used browser is `chrome`.

A note will be printed on screen to show which version you are using. For example:

```
ℹ️ Running benchmark using browser firefox (firefox/129.0a1)
```

### Reading the results

When a benchmark completes, results are printed to the console as an array of objects.

For example, running `npm run benchmark btn` yields output like:

```
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

Here is what each field represents:

- `scenario`: The DOM scenario or test environment variation being evaluated (e.g. elements with `1 class`).
- `selector`: The CSS selector being tested (e.g. `.btn` or `[class^="btn-"]`).
- `description`: A human-readable description of the specific test case.
- `result`: The performance score measured in **runs per second** (`runs/s`). **Higher is better/faster.** In this example, `.btn` achieved ~6,265.73 runs per second, whereas `[class^="btn-"]` achieved ~659.47 runs per second.
- `perc`: The relative performance compared to the fastest test case in the benchmark suite (`(result / max) * 100`). The fastest result is normalized to `100.00%`, while `10.53%` indicates that `[class^="btn-"]` ran at ~10.5% the speed of the fastest selector (roughly 9.5× slower).

## Creating a benchmark

Benchmarks are HTML pages stored in a subfolder in `./src/benchmarks/`. The page **MUST** expose a `window.startTest` method which returns a promise. When the test logic is done, it **MUST** resolve that promise.

This `window.startTest` is automatically invoked by `npm run benchmark x` when the page has loaded. Once `window.startTest` has resolved, the benchmark will be closed and any returned output will be logged.

Using [Chromium’s `PerfTestRunner`](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/perf_tests/resources/runner.js), a typical test looks like this:

```html
<script type="module">
import PerfTestRunner from '/lib/PerfTestRunner.js';

window.startTest = () => new Promise((resolve, reject) => {
	PerfTestRunner.measureRunsPerSecond({
		description: 'This is an example benchmark',
		run: function () {
			// Benchmark logic here, e.g. a document.querySelectorAll call in a loop
		},
		done: resolve,
	});
});
</script>
```

Naming your benchmark `index.html` is not required, but then you need to append the filename to the invocation, e.g. `npm run benchmark dom/qsa.html`.
