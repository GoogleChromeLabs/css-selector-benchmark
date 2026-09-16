/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates a realistic nested HTML string for a range of node indices [startIdx..endIdx].
 * Every element created gets class="node n{i}".
 */
export function buildSubtreeHTML(startIdx, endIdx) {
	const count = endIdx - startIdx + 1;
	if (count <= 0) return '';

	// We create a realistic 3-level hierarchy:
	// Groups of ~6 nodes: 1 section container -> 2 row containers -> leaves
	let html = '';
	let i = startIdx;

	while (i <= endIdx) {
		const sectionIdx = i++;
		html += `<div class="node n${sectionIdx}">`;

		// Up to 2 sub-containers per section
		for (let r = 0; r < 2 && i <= endIdx; r++) {
			const rowIdx = i++;
			html += `<div class="node n${rowIdx}">`;

			// Up to 2 leaf spans per row
			for (let l = 0; l < 2 && i <= endIdx; l++) {
				const leafIdx = i++;
				html += `<span class="node n${leafIdx}">Item ${leafIdx}</span>`;
			}

			html += `</div>`;
		}

		html += `</div>`;
	}

	return html;
}

/**
 * Generates CSS rules for nodes [1..innerCount].
 *
 * @param {number} innerCount - 19 (for 20-node component) or 39 (for 40-node component)
 * @param {'light' | 'shadow' | 'seam'} mode
 * @param {string} stateSelector - e.g. '.active' or '[active]'
 */
export function buildComponentCSS(innerCount, mode, stateSelector = '.active') {
	const rules = [];

	// Base rules for component host/root
	if (mode === 'light') {
		rules.push(`
			.comp {
				display: block;
				box-sizing: border-box;
				padding: 2px;
				border: 1px solid var(--c-border, #ccc);
				background: var(--c-bg, #fff);
				color: var(--c-text, #111);
				font-size: var(--c-size, 13px);
			}
		`);
	} else {
		rules.push(`
			:host {
				display: block;
				box-sizing: border-box;
				padding: 2px;
				border: 1px solid var(--c-border, #ccc);
				background: var(--c-bg, #fff);
				color: var(--c-text, #111);
				font-size: var(--c-size, 13px);
			}
		`);
	}

	const splitIdx = Math.ceil(innerCount / 2); // For seam mode: 1..splitIdx in shadow, (splitIdx+1)..innerCount in light slot

	for (let i = 1; i <= innerCount; i++) {
		const pad = (i % 3) + 1;

		if (mode === 'light') {
			rules.push(`
				.comp .n${i} {
					padding: ${pad}px;
					margin: 1px;
					border-radius: 2px;
					color: #111827;
					background-color: transparent;
				}
				.comp${stateSelector} .n${i} {
					background-color: rgba(37, 99, 235, 0.08);
					color: #1d4ed8;
					outline-color: #2563eb;
				}
			`);
		} else if (mode === 'shadow') {
			rules.push(`
				.n${i} {
					padding: ${pad}px;
					margin: 1px;
					border-radius: 2px;
					color: #111827;
					background-color: transparent;
				}
				:host(${stateSelector}) .n${i} {
					background-color: rgba(37, 99, 235, 0.08);
					color: #1d4ed8;
					outline-color: #2563eb;
				}
			`);
		} else if (mode === 'seam') {
			if (i <= splitIdx) {
				// Shadow node inside seam component
				rules.push(`
					.n${i} {
						padding: ${pad}px;
						margin: 1px;
						border-radius: 2px;
						color: #111827;
						background-color: transparent;
					}
					:host(${stateSelector}) .n${i} {
						background-color: rgba(37, 99, 235, 0.08);
						color: #1d4ed8;
						outline-color: #2563eb;
					}
				`);
			} else {
				// Slotted Light DOM node styled across the seam via ::slotted()
				rules.push(`
					::slotted(.n${i}) {
						padding: ${pad}px;
						margin: 1px;
						border-radius: 2px;
						color: #111827;
						background-color: transparent;
					}
					:host(${stateSelector}) ::slotted(.n${i}) {
						background-color: rgba(37, 99, 235, 0.08);
						color: #1d4ed8;
						outline-color: #2563eb;
					}
				`);
			}
		}
	}

	return rules.join('\n');
}

/**
 * Forces style recalculation without triggering layout.
 */
export function forceStyleRecalc(el = document.documentElement) {
	return window.getComputedStyle(el).color;
}

/**
 * Creates a Light DOM component instance with exactly `totalNodes` elements (1 root + (totalNodes-1) descendants).
 */
const lightTemplates = new Map();
export function createLightInstance(totalNodes) {
	let tpl = lightTemplates.get(totalNodes);
	if (!tpl) {
		tpl = document.createElement('template');
		const innerCount = totalNodes - 1;
		tpl.innerHTML = buildSubtreeHTML(1, innerCount);
		lightTemplates.set(totalNodes, tpl);
	}
	const host = document.createElement('div');
	host.className = 'comp';
	host.appendChild(tpl.content.cloneNode(true));
	return host;
}

/**
 * Creates a Shadow DOM component instance with 1 Light DOM host + (totalNodes-1) Shadow DOM nodes.
 * Supports either shared adoptedStyleSheets or inline <style> tag.
 */
const shadowTemplates = new Map();
export function createShadowInstance(totalNodes, sharedSheet = null, inlineCSS = null) {
	const key = `${totalNodes}-${inlineCSS ? 'inline' : 'adopted'}`;
	let tpl = shadowTemplates.get(key);
	if (!tpl) {
		tpl = document.createElement('template');
		const innerCount = totalNodes - 1;
		const styleTag = inlineCSS ? `<style>${inlineCSS}</style>` : '';
		tpl.innerHTML = `${styleTag}${buildSubtreeHTML(1, innerCount)}`;
		shadowTemplates.set(key, tpl);
	}

	const host = document.createElement('div');
	host.className = 'comp';
	const shadow = host.attachShadow({ mode: 'open' });
	if (sharedSheet) {
		shadow.adoptedStyleSheets = [sharedSheet];
	}
	shadow.appendChild(tpl.content.cloneNode(true));
	return host;
}

/**
 * Creates a Seam (Slotted) component instance with:
 * - 1 Light DOM host
 * - splitIdx Shadow DOM nodes (including <slot> elements)
 * - (innerCount - splitIdx) Light DOM children slotted across the seam into Shadow DOM
 * Total DOM nodes = 1 + splitIdx + (innerCount - splitIdx) = totalNodes.
 */
const seamTemplates = new Map();
export function createSeamInstance(totalNodes, sharedSheet = null) {
	let entry = seamTemplates.get(totalNodes);
	if (!entry) {
		const innerCount = totalNodes - 1;
		const shadowCount = Math.ceil(innerCount / 2); // e.g. 10 shadow nodes for 20 total (9 nodes + 1 slot)
		const shadowHTML = `${buildSubtreeHTML(1, shadowCount - 1)}<slot name="seam-slot" class="node n${shadowCount}"></slot>`;

		let lightChildrenHTML = '';
		for (let i = shadowCount + 1; i <= innerCount; i++) {
			lightChildrenHTML += `<span slot="seam-slot" class="node n${i}">Slotted ${i}</span>`;
		}

		const shadowTpl = document.createElement('template');
		shadowTpl.innerHTML = shadowHTML;

		const lightTpl = document.createElement('template');
		lightTpl.innerHTML = lightChildrenHTML;

		entry = { shadowTpl, lightTpl };
		seamTemplates.set(totalNodes, entry);
	}

	const host = document.createElement('div');
	host.className = 'comp';
	host.appendChild(entry.lightTpl.content.cloneNode(true));
	const shadow = host.attachShadow({ mode: 'open' });
	if (sharedSheet) {
		shadow.adoptedStyleSheets = [sharedSheet];
	}
	shadow.appendChild(entry.shadowTpl.content.cloneNode(true));
	return host;
}

/**
 * Utility to count total Element nodes (Light + Shadow) in an instance for verification.
 */
export function countTotalElements(el) {
	let count = 1; // el itself
	// Light children
	for (const child of el.children) {
		count += countTotalElements(child);
	}
	// Shadow children (excluding <style>)
	if (el.shadowRoot) {
		for (const child of el.shadowRoot.children) {
			if (child.tagName.toLowerCase() !== 'style') {
				count += countTotalElements(child);
			}
		}
	}
	return count;
}
