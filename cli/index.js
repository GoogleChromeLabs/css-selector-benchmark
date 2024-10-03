/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const params = args.filter(a => !a.startsWith('--'));

// Determine which page to use
if (!params.length) {
	console.error('❌ Missing benchmark argument.');
	process.exit(1);
}
const pageUrl = `http://localhost:3000/benchmarks/${process.argv[2]}`.trim();

// Determine which browser to use
const supportedBrowsers = ['chrome', 'firefox'];
let requestedBrowser = flags.filter(f => f.startsWith('--browser=')).reduce((p, c) => `${p}${c}`, '');
if (requestedBrowser) {
	requestedBrowser = requestedBrowser.replace('--browser=', '');

	if (!supportedBrowsers.includes(requestedBrowser)) {
		console.error(`❌ Invalid browser. Only accepted values are ${supportedBrowsers.join(', ')}`);
		process.exit(1);
	}
} else {
	requestedBrowser = supportedBrowsers[0];
}

const puppeteerOptions = {
	'chrome': {
		headless: 'new',
		args: [
			"--flag-switches-begin",
			"--enable-experimental-web-platform-features",
			"--flag-switches-end",
		],
	},
	'firefox': {

	},
};

const browser = await puppeteer.launch({
	product: requestedBrowser,
	protocol: 'webDriverBiDi',
	...puppeteerOptions[requestedBrowser],
});

const browserVersion = await browser.version();
console.info(`ℹ️ Running benchmark using browser ${requestedBrowser} (${browserVersion})`);

const page = await browser.newPage();

// Pipe Console output and errors to CLI
page.on('console', (message) => {
	console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`);
}).on('pageerror', ({ message }) => {
	console.error(`❌ PageError: ${message}`);
});

// Catch server not running
page.on('requestfailed', (request) => {

	switch (request.failure().errorText) {
		case 'net::ERR_CONNECTION_REFUSED':
			console.error(`❌ Could not connect to server`);
			console.info('ℹ️ Please start the webserver first by running `npm run start` in parallel');
			break;
		default:
			console.error(`❌ ${request.failure().errorText} ${request.url()}`);
			break;
	}
	process.exit(1);
});

// Detect a 404 on the pageUrl, indicating it’s an invalid benchmark
page.on('response', response => {
	if ((response.status() === 404) && (response.url() === pageUrl)) {
		console.error(`❌ Invalid benchmark. The page at ${pageUrl} could not be found`);
		process.exit(1);
	}
});

// Navigate to test page
await page.goto(pageUrl);

// Run and wait for test
console.log('== Starting Benchmark ====== ');
const results = await page.evaluate(async () => {
	return await window.startTest();
});
console.log('== End Benchmark =========== ');

// Process Results (@TODO)
if (results) {
	for (const result of results) {
		console.log(result);
	}
}

// Close browser
await browser.close();
