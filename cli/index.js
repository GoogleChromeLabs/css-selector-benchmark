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
const supportedBrowserChannels = {
	'chrome': ['chrome', 'chrome-beta', 'chrome-canary', 'chrome-dev'],
	'firefox': null,
};

let requestedBrowser = flags.filter(f => f.startsWith('--browser=')).reduce((p, c) => `${p}${c}`, '');
let requestedBrowserChannel;

if (requestedBrowser) {
	requestedBrowserChannel = requestedBrowser.replace('--browser=', '');
	requestedBrowser = requestedBrowser.replace('--browser=', '').split('-')[0];

	// Check if browser is suppported
	if (!supportedBrowsers.includes(requestedBrowser)) {
		console.error(`❌ Invalid browser “${requestedBrowser}”. Only accepted values are ${supportedBrowsers.join(', ')}`);
		process.exit(1);
	}

	// Check if channel is supported
	if (supportedBrowserChannels[requestedBrowser]) {
		if (!supportedBrowserChannels[requestedBrowser].includes(requestedBrowserChannel)) {
			console.error(`❌ Invalid browserChannel “${requestedBrowserChannel}” for browser “${requestedBrowser}”. Only accepted values are ${supportedBrowserChannels[requestedBrowser].join(', ')}`);
			process.exit(1);
		}
	} else {
		requestedBrowserChannel = null;
	}

} else {
	requestedBrowser = supportedBrowsers[0];
	requestedBrowserChannel = supportedBrowserChannels[requestedBrowser] ? supportedBrowserChannels[requestedBrowser][0] : null;
}

const puppeteerOptions = {
	'chrome': {
		channel: requestedBrowserChannel,
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
