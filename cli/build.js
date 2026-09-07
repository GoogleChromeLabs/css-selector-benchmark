/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.resolve(rootDir, 'src');
const buildDir = path.resolve(rootDir, 'build');

const GTAG_SNIPPET = `		<script async src="https://www.googletagmanager.com/gtag/js?id=G-754F24EHD8" fetchpriority="low"></script>
		<script>
			window.dataLayer = window.dataLayer || [];
			function gtag() {
				dataLayer.push(arguments);
			}
			gtag("js", new Date());
			gtag("config", "G-754F24EHD8");
		</script>`;

function injectGtag(content) {
	if (content.includes('G-754F24EHD8')) {
		return content;
	}

	return content.replace('\t</body>', `${GTAG_SNIPPET}\n\t</body>`);
}

function copyAndProcess(currentSrc, currentDest, stats = { total: 0, injected: 0 }) {
	fs.mkdirSync(currentDest, { recursive: true });
	const entries = fs.readdirSync(currentSrc, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(currentSrc, entry.name);
		const destPath = path.join(currentDest, entry.name);

		if (entry.isDirectory()) {
			copyAndProcess(srcPath, destPath, stats);
		} else if (entry.isFile()) {
			stats.total++;
			if (entry.name === 'index.html') {
				const content = fs.readFileSync(srcPath, 'utf8');
				const modified = injectGtag(content);
				fs.writeFileSync(destPath, modified, 'utf8');
				stats.injected++;
			} else {
				fs.copyFileSync(srcPath, destPath);
			}
		}
	}

	return stats;
}

function build() {
	console.log('Building site for deployment...');

	if (!fs.existsSync(srcDir)) {
		console.error(`❌ Error: Source directory "${srcDir}" does not exist.`);
		process.exit(1);
	}

	// Clean destination directory
	fs.rmSync(buildDir, { recursive: true, force: true });
	fs.mkdirSync(buildDir, { recursive: true });

	const stats = copyAndProcess(srcDir, buildDir);

	console.log(`✅ Build completed: ${stats.total} files copied, ${stats.injected} index.html files injected into ${buildDir}`);
}

build();
