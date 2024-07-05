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
