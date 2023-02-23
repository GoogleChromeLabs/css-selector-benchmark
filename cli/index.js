import puppeteer from 'puppeteer';

if (!process.argv[2]) {
	console.error('❌ Missing test argument');
	process.exit(1);
}

const browser = await puppeteer.launch({
	headless: 'new',
});

const page = await browser.newPage();

// Pipe Console output and errors to CLI
page.on('console', (message) => {
	console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`);
}).on('pageerror', ({ message }) => {
	console.error(`❌ PageError: ${message}`);
});

// Catch server not running
page.on('requestfailed', (request) => {
	console.error(`❌ ${request.failure().errorText} ${request.url()}`);

	switch (request.failure().errorText) {
		case 'net::ERR_CONNECTION_REFUSED':
			console.info('ℹ️ Please start the webserver first by running `npm run start`');
			break;
		default:
			break;
	}
	process.exit(1);
});

// Navigate to test page
await page.goto(`http://localhost:3000/benchmarks/${process.argv[2]}`);

// Run and wait for test
await page.evaluate(async () => {
	await window.startTest();
});

// Close browser
await browser.close();
