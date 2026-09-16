/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared DOM Tree diagrams using <mermaid-element> and DIY <dialog> Lightbox
 * for Light DOM vs. Shadow DOM benchmarks.
 *
 * Uses top-down hierarchical DOM trees (`flowchart TD`) with a dashed
 * `Shadow Boundary` subgraph box around `#shadow-root` and its shadow descendants.
 */

import 'https://cdn.jsdelivr.net/npm/mermaid-element/index.js';

function escapeHTML(str) {
	return String(str ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export const STYLES_AND_LIGHTBOX_CSS = `
	/* Topology Visual Gallery Grid */
	.topology-section {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
	}

	.topology-section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.75rem;
	}

	.topology-section-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text);
		margin: 0;
	}

	.topology-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-muted);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.legend-swatch {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		display: inline-block;
	}

	.swatch-light {
		background: #dbeafe;
		border: 1.5px solid #2563eb;
	}

	.swatch-boundary {
		background: #faf5ff;
		border: 2px dashed #7c3aed;
	}

	.swatch-shadow {
		background: #dcfce7;
		border: 1.5px solid #059669;
	}

	.swatch-seam {
		background: #fef3c7;
		border: 1.5px solid #d97706;
	}

	.swatch-invalidated {
		background: #ffe4e6;
		border: 1.5px solid #e11d48;
	}

	.topology-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 0.85rem;
	}

	.topology-card {
		background: #f8fafc;
		border: 1px solid var(--border-dark);
		border-radius: 8px;
		padding: 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
		position: relative;
	}

	.topology-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
		border-color: var(--accent);
	}

	.topology-card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.topology-card-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text);
		line-height: 1.35;
	}

	.topology-zoom-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		color: var(--accent);
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		padding: 0.15rem 0.45rem;
		border-radius: 999px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.topology-svg-preview {
		width: 100%;
		min-height: 210px;
		background: #ffffff;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.5rem;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.topology-svg-preview mermaid-element {
		width: 100%;
		display: block;
	}

	.topology-card-caption {
		font-size: 0.78125rem;
		color: var(--text-muted);
		line-height: 1.45;
		margin: 0;
	}

	/* Table Row Diagram Trigger Button */
	.topology-cell-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-diagram-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--accent);
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.btn-diagram-trigger:hover {
		background: #dbeafe;
		border-color: #93c5fd;
	}

	.btn-diagram-trigger svg {
		width: 13px;
		height: 13px;
		stroke: currentColor;
		fill: none;
	}

	/* DIY Modal <dialog> Lightbox - explicitly centered */
	dialog.topology-lightbox {
		margin: auto;
		position: fixed;
		inset: 0;
		max-width: 920px;
		width: calc(100vw - 2rem);
		height: fit-content;
		max-height: calc(100vh - 2rem);
		border: 1px solid var(--border-dark);
		border-radius: 12px;
		padding: 0;
		background: var(--surface);
		color: var(--text);
		box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.45);
		overflow: hidden;
	}

	dialog.topology-lightbox::backdrop {
		background: rgba(15, 23, 42, 0.65);
		backdrop-filter: blur(4px);
	}

	.lightbox-container {
		display: flex;
		flex-direction: column;
		max-height: calc(100vh - 2rem);
	}

	.lightbox-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.15rem 1.5rem;
		border-bottom: 1px solid var(--border);
		background: #f8fafc;
	}

	.lightbox-title-group {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.lightbox-title {
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}

	.lightbox-subtitle {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin: 0;
	}

	.lightbox-close-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 6px;
		border: 1px solid var(--border-dark);
		background: var(--surface);
		color: var(--text-muted);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.lightbox-close-btn:hover {
		background: #f1f5f9;
		color: var(--text);
	}

	.lightbox-body {
		padding: 1.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.lightbox-svg-stage {
		background: #ffffff;
		border: 1px solid var(--border-dark);
		border-radius: 8px;
		padding: 1rem 1.5rem;
		min-height: 240px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.02);
	}

	.lightbox-svg-stage mermaid-element {
		max-width: 520px;
		width: 100%;
		margin: 0 auto;
		display: block;
	}

	.lightbox-details-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
	}

	@media (max-width: 720px) {
		.lightbox-details-grid {
			grid-template-columns: 1fr;
		}
	}

	.lightbox-detail-box {
		background: #f8fafc;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.85rem 1rem;
	}

	.lightbox-detail-box h4 {
		font-size: 0.78125rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin: 0 0 0.4rem 0;
	}

	.lightbox-detail-box p {
		font-size: 0.85rem;
		color: var(--text);
		margin: 0;
		line-height: 1.5;
	}
`;

/**
 * Diagram 1: Pure Light DOM (No Shadow Boundary)
 */
const MERMAID_LIGHT_DOM = `
flowchart TD
    doc["document"] --> comp["&lt;div class='comp'&gt;"]
    comp --> n1["&lt;div class='n1'&gt;"]
    comp --> n2["&lt;div class='n2'&gt;"]
    comp --> dots["..."]
    comp --> n19["&lt;span class='n19'&gt;"]

    classDef docNode fill:#f1f5f9,stroke:#64748b,color:#334155
    classDef lightNode fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#1e3a8a
    class doc docNode
    class comp,n1,n2,dots,n19 lightNode
`;

/**
 * Diagram 2: Shadow DOM with Shared Constructable Stylesheet (adoptedStyleSheets)
 * Note: Edge declaration order is tuned for Dagre's subgraph layout so visual left-to-right order is:
 * adoptedStyleSheets -> n1 -> n2 -> ... -> n19
 */
const MERMAID_SHADOW_SHARED = `
flowchart TD
    doc["document"] --> comp["&lt;div class='comp'&gt;"]
    comp --> sr

    subgraph boundary ["Shadow Boundary"]
        sr(["#shadow-root (open)"])
        sr --> n1["&lt;div class='n1'&gt;"]
        sr --> n2["&lt;div class='n2'&gt;"]
        sr -.- adopted["adoptedStyleSheets"]
        sr --> dots["..."]
        sr --> n19["&lt;span class='n19'&gt;"]
    end

    classDef docNode fill:#f1f5f9,stroke:#64748b,color:#334155
    classDef lightNode fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#1e3a8a
    classDef shadowRoot fill:#f3e8ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6
    classDef styleNode fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#92400e
    classDef shadowNode fill:#dcfce7,stroke:#059669,stroke-width:1.5px,color:#065f46

    class doc docNode
    class comp lightNode
    class sr shadowRoot
    class adopted styleNode
    class n1,n2,dots,n19 shadowNode
    style boundary fill:#faf5ff,stroke:#7c3aed,stroke-width:2px,stroke-dasharray: 6 4,color:#6d28d9
`;

/**
 * Diagram 3: Shadow DOM with Cloned Inline <style> Tag
 * Note: Edge declaration order is tuned for Dagre's subgraph layout so visual left-to-right order is:
 * <style> -> n1 -> n2 -> ... -> n19
 */
const MERMAID_SHADOW_INLINE = `
flowchart TD
    doc["document"] --> comp["&lt;div class='comp'&gt;"]
    comp --> sr

    subgraph boundary ["Shadow Boundary"]
        sr(["#shadow-root (open)"])
        sr --> n1["&lt;div class='n1'&gt;"]
        sr --> n2["&lt;div class='n2'&gt;"]
        sr --> styleTag["&lt;style&gt;"]
        sr --> dots["..."]
        sr --> n19["&lt;span class='n19'&gt;"]
    end

    classDef docNode fill:#f1f5f9,stroke:#64748b,color:#334155
    classDef lightNode fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#1e3a8a
    classDef shadowRoot fill:#f3e8ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6
    classDef styleNode fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#92400e
    classDef shadowNode fill:#dcfce7,stroke:#059669,stroke-width:1.5px,color:#065f46

    class doc docNode
    class comp lightNode
    class sr shadowRoot
    class styleTag styleNode
    class n1,n2,dots,n19 shadowNode
    style boundary fill:#faf5ff,stroke:#7c3aed,stroke-width:2px,stroke-dasharray: 6 4,color:#6d28d9
`;

/**
 * Diagram 4: Hybrid <slot> Seam Projection
 */
const MERMAID_SLOTTED_SEAM = `
flowchart TD
    doc["document"] --> comp["&lt;div class='comp'&gt;"]

    comp --> s11["&lt;span slot='item' class='n11'&gt;"]
    comp --> s19["&lt;span slot='item' class='n19'&gt;"]
    comp --> sr

    subgraph boundary ["Shadow Boundary"]
        sr(["#shadow-root (open)"])
        sr --> n1["&lt;div class='n1'&gt;"]
        sr --> n10["&lt;div class='n10'&gt;"]
        n10 --> slotEl["&lt;slot name='item'&gt;"]
    end

    s11 -.-> slotEl
    s19 -.-> slotEl

    classDef docNode fill:#f1f5f9,stroke:#64748b,color:#334155
    classDef lightNode fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#1e3a8a
    classDef shadowRoot fill:#f3e8ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6
    classDef shadowNode fill:#dcfce7,stroke:#059669,stroke-width:1.5px,color:#065f46
    classDef slotNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e

    class doc docNode
    class comp,s11,s19 lightNode
    class sr shadowRoot
    class n1,n10 shadowNode
    class slotEl slotNode
    style boundary fill:#faf5ff,stroke:#7c3aed,stroke-width:2px,stroke-dasharray: 6 4,color:#6d28d9
`;

/**
 * Diagram 5: Outer Invalidation — Unencapsulated Light DOM
 */
const MERMAID_OUTER_UNENCAPSULATED = `
flowchart TD
    app["&lt;div id='app' class='drawer-open'&gt;"] --> comp["&lt;div class='comp'&gt;"]
    comp --> n1["&lt;div class='node n1'&gt;"]
    comp --> n2["&lt;div class='node n2'&gt;"]
    comp --> dots["..."]
    comp --> n19["&lt;span class='node n19'&gt;"]

    classDef invalidated fill:#ffe4e6,stroke:#e11d48,stroke-width:2px,color:#881337
    class app,comp,n1,n2,dots,n19 invalidated
`;

/**
 * Diagram 6: Outer Invalidation — Encapsulated Shadow DOM Shield
 */
const MERMAID_OUTER_SHIELDED = `
flowchart TD
    app["&lt;div id='app' class='drawer-open'&gt;"] --> comp["&lt;div class='comp'&gt;"]
    comp --> sr

    subgraph boundary ["Shadow Boundary"]
        sr(["#shadow-root (open)"])
        sr --> n1["&lt;div class='node n1'&gt;"]
        sr --> n2["&lt;div class='node n2'&gt;"]
        sr -.- adopted["adoptedStyleSheets"]
        sr --> dots["..."]
        sr --> n19["&lt;span class='node n19'&gt;"]
    end

    classDef invalidated fill:#ffe4e6,stroke:#e11d48,stroke-width:2px,color:#881337
    classDef shadowRoot fill:#f3e8ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6
    classDef styleNode fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#92400e
    classDef shielded fill:#dcfce7,stroke:#059669,stroke-width:1.5px,color:#065f46

    class app,comp invalidated
    class sr shadowRoot
    class adopted styleNode
    class n1,n2,dots,n19 shielded
    style boundary fill:#faf5ff,stroke:#7c3aed,stroke-width:2px,stroke-dasharray: 6 4,color:#6d28d9
`;

/**
 * Diagram 7: Outer Invalidation — Slotted Seam (Slotted nodes sit outside Shadow Boundary)
 */
const MERMAID_OUTER_SLOTTED = `
flowchart TD
    app["&lt;div id='app' class='drawer-open'&gt;"] --> comp["&lt;div class='comp'&gt;"]

    comp --> s11["&lt;span slot='item' class='node n11'&gt;"]
    comp --> s19["&lt;span slot='item' class='node n19'&gt;"]
    comp --> sr

    subgraph boundary ["Shadow Boundary"]
        sr(["#shadow-root (open)"])
        sr --> n1["&lt;div class='node n1'&gt;"]
        sr --> n10["&lt;div class='node n10'&gt;"]
        n10 --> slotEl["&lt;slot name='item'&gt;"]
    end

    s11 -.-> slotEl
    s19 -.-> slotEl

    classDef invalidated fill:#ffe4e6,stroke:#e11d48,stroke-width:2px,color:#881337
    classDef shadowRoot fill:#f3e8ff,stroke:#7c3aed,stroke-width:2px,color:#5b21b6
    classDef shielded fill:#dcfce7,stroke:#059669,stroke-width:1.5px,color:#065f46
    classDef slotNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e

    class app,comp,s11,s19 invalidated
    class sr shadowRoot
    class n1,n10 shielded
    class slotEl slotNode
    style boundary fill:#faf5ff,stroke:#7c3aed,stroke-width:2px,stroke-dasharray: 6 4,color:#6d28d9
`;

/**
 * Diagram 8: Instance Scaling (100 -> 1,000 Instances)
 */
const MERMAID_INSTANCE_SCALING = `
flowchart TD
    doc["document"] --> c1["&lt;div class='comp'&gt; #1"]
    doc --> target["&lt;div class='comp active'&gt; #N/2"]
    doc --> cN["&lt;div class='comp'&gt; #N"]

    c1 --> sr1

    subgraph b1 ["Shadow Boundary #1"]
        sr1(["#shadow-root"]) --> c1n["39 Shadow Nodes"]
    end

    target --> srTarget

    subgraph bTarget ["Shadow Boundary #N/2"]
        srTarget(["#shadow-root"]) --> tn1["&lt;div class='n1'&gt;"]
        srTarget --> tn39["&lt;span class='n39'&gt;"]
    end

    cN --> srN

    subgraph bN ["Shadow Boundary #N"]
        srN(["#shadow-root"]) --> cNn["39 Shadow Nodes"]
    end

    classDef docNode fill:#f1f5f9,stroke:#64748b,color:#334155
    classDef idleHost fill:#f8fafc,stroke:#94a3b8,color:#64748b
    classDef activeHost fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a8a
    classDef shadowRoot fill:#f3e8ff,stroke:#7c3aed,stroke-width:1.5px,color:#5b21b6
    classDef activeShadow fill:#dcfce7,stroke:#059669,stroke-width:2px,color:#065f46
    classDef idleShadow fill:#f0fdf4,stroke:#86efac,color:#166534

    class doc docNode
    class c1,cN idleHost
    class target activeHost
    class sr1,srTarget,srN shadowRoot
    class tn1,tn39 activeShadow
    class c1n,cNn idleShadow
    style b1 fill:#fafafa,stroke:#cbd5e1,stroke-dasharray: 4 3,color:#64748b
    style bTarget fill:#faf5ff,stroke:#7c3aed,stroke-width:2px,stroke-dasharray: 6 4,color:#6d28d9
    style bN fill:#fafafa,stroke:#cbd5e1,stroke-dasharray: 4 3,color:#64748b
`;

/**
 * Catalog of topologies for each benchmark page
 */
export const TOPOLOGY_DIAGRAMS = {
	light: {
		id: 'light',
		title: 'Pure Light DOM Tree (20 or 40 Nodes)',
		subtitle: 'All child nodes connect directly under <div class="comp"> in the Document DOM tree with no #shadow-root boundary.',
		badge: 'No Shadow Boundary',
		mermaid: MERMAID_LIGHT_DOM,
		boundaryDesc: 'None. <div class="comp"> connects directly to all 19 (or 39) child nodes in the global Document tree.',
		exposureDesc: '100% Exposed (20/20 or 40/40 nodes per instance). Any document-level CSS rule or ancestor state change can match or invalidate these nodes.',
		mechanismDesc: 'Matched via standard document descendant selectors (.comp.active .n1..n19) stored in document.adoptedStyleSheets.',
	},
	shadowShared: {
		id: 'shadowShared',
		title: 'Shadow DOM Tree + Shared CSSStyleSheet',
		subtitle: '<div class="comp"> connects to #shadow-root, with the dashed Shadow Boundary box enclosing #shadow-root and its 19/39 children.',
		badge: 'Shadow Boundary + Shared CSS',
		mermaid: MERMAID_SHADOW_SHARED,
		boundaryDesc: 'The dashed Shadow Boundary box surrounds #shadow-root and all 19 (or 39) internal component nodes.',
		exposureDesc: 'Only the outer <div class="comp"> host node is in Light DOM (5%). All 19/39 nodes inside the Shadow Boundary (95%+) are shielded.',
		mechanismDesc: 'All component instances share a single parsed CSSStyleSheet in memory via shadowRoot.adoptedStyleSheets = [sharedSheet], matching :host(.active) .nX.',
	},
	shadowInline: {
		id: 'shadowInline',
		title: 'Shadow DOM Tree + Cloned Inline <style> Tag',
		subtitle: 'The dashed Shadow Boundary box encloses #shadow-root, an inline <style> element node, and all 19/39 shadow children.',
		badge: 'Shadow Boundary + Inline <style>',
		mermaid: MERMAID_SHADOW_INLINE,
		boundaryDesc: 'The dashed Shadow Boundary box encloses #shadow-root, its inline <style> child node, and the 19 (or 39) inner DOM nodes.',
		exposureDesc: 'Only the outer <div class="comp"> host node is exposed to Document CSS. All nodes inside the Shadow Boundary are shielded.',
		mechanismDesc: 'Each ShadowRoot contains its own cloned <style>:host(.active) .n1...</style> element node in the tree.',
	},
	slottedSeam: {
		id: 'slottedSeam',
		title: 'Hybrid <slot> Seam DOM Tree',
		subtitle: 'Slotted children branch off <div class="comp"> outside the Shadow Boundary box and project into <slot> inside the Shadow Boundary.',
		badge: '<slot> & ::slotted() Seam',
		mermaid: MERMAID_SLOTTED_SEAM,
		boundaryDesc: 'The Shadow Boundary box encloses #shadow-root, .n1..n10, and <slot name="item">, while <span slot="item"> children sit outside the boundary in Light DOM.',
		exposureDesc: 'Half Exposed / Half Shielded: Because <span slot="item"> nodes sit outside the Shadow Boundary box in Light DOM, they remain exposed to global document CSS.',
		mechanismDesc: 'Dashed projection links connect Light DOM <span slot="item"> nodes across the Shadow Boundary into <slot name="item">, styled via ::slotted(.nX).',
	},
	outerUnencapsulated: {
		id: 'outerUnencapsulated',
		title: 'Outer Invalidation: Unencapsulated Light DOM Tree',
		subtitle: 'Without a Shadow Boundary box, mutating <div id="app" class="drawer-open"> invalidates every node in the tree (highlighted in rose).',
		badge: '100% Exposed to Outer CSS',
		mermaid: MERMAID_OUTER_UNENCAPSULATED,
		boundaryDesc: 'None. All nodes sit directly under <div id="app"> -> <div class="comp"> in the global Document tree.',
		exposureDesc: 'All 10,000 to 20,000 nodes are invalidated (rose highlight) when #app toggles .drawer-open.',
		mechanismDesc: 'Global descendant selectors (#app.drawer-open .node) traverse the entire unencapsulated tree (~15–35 ms per toggle).',
	},
	outerShielded: {
		id: 'outerShielded',
		title: 'Outer Invalidation: Shadow Boundary Shield',
		subtitle: 'Outer invalidation (rose) stops at <div class="comp"> — the dashed Shadow Boundary box shields #shadow-root and all green inner nodes.',
		badge: 'Shadow Shield (99%+ Protected)',
		mermaid: MERMAID_OUTER_SHIELDED,
		boundaryDesc: 'The dashed Shadow Boundary box surrounds #shadow-root and all 19/39 inner nodes.',
		exposureDesc: 'Only <div id="app"> and <div class="comp"> are invalidated (rose). All 9,500–19,500 nodes inside the Shadow Boundary remain shielded (green).',
		mechanismDesc: 'Outer #app.drawer-open .node selectors cannot cross the Shadow Boundary (0.019 ms vs 35.0 ms — 809× to 1,804× faster).',
	},
	outerSlotted: {
		id: 'outerSlotted',
		title: 'Outer Invalidation: Slotted Seam Exposure',
		subtitle: 'Because <span slot="item"> nodes branch off <div class="comp"> outside the Shadow Boundary box, they are invalidated (rose) by outer #app CSS.',
		badge: 'Slotted Nodes Remain Exposed',
		mermaid: MERMAID_OUTER_SLOTTED,
		boundaryDesc: 'The Shadow Boundary box surrounds #shadow-root and .n1..n10 (green), while <span slot="item"> children sit outside the boundary in Light DOM (rose).',
		exposureDesc: 'Slotted Light DOM children (rose) are invalidated by outer page CSS, whereas internal Shadow DOM nodes (green) remain shielded.',
		mechanismDesc: 'Outer #app.drawer-open .node rules match all <span slot="item" class="node"> elements because their DOM parent is <div class="comp"> in Light DOM.',
	},
	instanceScaling: {
		id: 'instanceScaling',
		title: 'Instance Scaling Tree (100 → 1,000 Instances)',
		subtitle: 'Mutating target instance #N/2 recalculates strictly inside its isolated Shadow Boundary box (#N/2) while sibling instances remain idle.',
		badge: '4k to 40k Total Nodes',
		mermaid: MERMAID_INSTANCE_SCALING,
		boundaryDesc: 'Each component instance has its own isolated Shadow Boundary box around its #shadow-root and 39 internal nodes.',
		exposureDesc: 'Only target instance #N/2 is active; instances #1 through #N remain idle bystanders.',
		mechanismDesc: 'Blink scopes style recalculation to the mutated subtree (~30.5k–48.5k runs/s across 100 to 1,000 instances).',
	},
};

/**
 * Maps a benchmark page type and subtest row to its corresponding diagram object.
 */
export function getDiagramForSubtest(pageType, selector = '', description = '') {
	const sel = selector.toLowerCase();
	const desc = description.toLowerCase();

	if (pageType === 'outer-invalidation') {
		if (sel.includes('slotted') || desc.includes('slotted') || sel.includes('exposed) +')) {
			return TOPOLOGY_DIAGRAMS.outerSlotted;
		}
		if (sel.includes('encapsulated') || desc.includes('shielded')) {
			return TOPOLOGY_DIAGRAMS.outerShielded;
		}
		return TOPOLOGY_DIAGRAMS.outerUnencapsulated;
	}

	if (pageType === 'instance-scaling') {
		return TOPOLOGY_DIAGRAMS.instanceScaling;
	}

	// mount or host-recalc
	if (sel.includes('seam') || sel.includes('slot') || desc.includes('slotted')) {
		return TOPOLOGY_DIAGRAMS.slottedSeam;
	}
	if (sel.includes('inline') || desc.includes('<style>')) {
		return TOPOLOGY_DIAGRAMS.shadowInline;
	}
	if (sel.includes('shadow') || desc.includes(':host')) {
		return TOPOLOGY_DIAGRAMS.shadowShared;
	}
	return TOPOLOGY_DIAGRAMS.light;
}

/**
 * Returns the list of distinct topology diagrams to display in the Visual Gallery for a given page.
 */
export function getGalleryDiagramsForPage(pageType) {
	if (pageType === 'outer-invalidation') {
		return [TOPOLOGY_DIAGRAMS.outerUnencapsulated, TOPOLOGY_DIAGRAMS.outerShielded, TOPOLOGY_DIAGRAMS.outerSlotted];
	}
	if (pageType === 'instance-scaling') {
		return [TOPOLOGY_DIAGRAMS.instanceScaling, TOPOLOGY_DIAGRAMS.light, TOPOLOGY_DIAGRAMS.shadowShared];
	}
	// mount & host-recalc share the 4 core topologies
	return [TOPOLOGY_DIAGRAMS.light, TOPOLOGY_DIAGRAMS.shadowShared, TOPOLOGY_DIAGRAMS.shadowInline, TOPOLOGY_DIAGRAMS.slottedSeam];
}

/**
 * Injects CSS, renders the Visual Topology Gallery section using <mermaid-element>,
 * and initializes the DIY <dialog> Lightbox.
 */
export function initTopologyDiagrams(pageType) {
	// 1. Inject CSS once
	if (!document.getElementById('topology-diagrams-css')) {
		const styleEl = document.createElement('style');
		styleEl.id = 'topology-diagrams-css';
		styleEl.textContent = STYLES_AND_LIGHTBOX_CSS;
		document.head.appendChild(styleEl);
	}

	// 2. Create the DIY modal <dialog> Lightbox if not already present
	let dialog = document.getElementById('topology-lightbox');
	if (!dialog) {
		dialog = document.createElement('dialog');
		dialog.id = 'topology-lightbox';
		dialog.className = 'topology-lightbox';
		dialog.innerHTML = `
			<div class="lightbox-container">
				<div class="lightbox-header">
					<div class="lightbox-title-group">
						<h3 class="lightbox-title" id="lightbox-title">Topology Diagram</h3>
						<p class="lightbox-subtitle" id="lightbox-subtitle"></p>
					</div>
					<button type="button" class="lightbox-close-btn" id="lightbox-close-btn" aria-label="Close Lightbox">&times;</button>
				</div>
				<div class="lightbox-body">
					<div class="lightbox-svg-stage" id="lightbox-svg-stage">
						<mermaid-element id="lightbox-mermaid"></mermaid-element>
					</div>
					<div class="lightbox-details-grid">
						<div class="lightbox-detail-box">
							<h4>🛡️ Shadow Boundary Position</h4>
							<p id="lightbox-boundary-desc"></p>
						</div>
						<div class="lightbox-detail-box">
							<h4>🔍 Exposed vs. Shielded Nodes</h4>
							<p id="lightbox-exposure-desc"></p>
						</div>
						<div class="lightbox-detail-box">
							<h4>⚡ Selector &amp; Seam Mechanism</h4>
							<p id="lightbox-mechanism-desc"></p>
						</div>
					</div>
				</div>
			</div>
		`;
		document.body.appendChild(dialog);

		// Close button handler
		const closeBtn = dialog.querySelector('#lightbox-close-btn');
		closeBtn.addEventListener('click', () => dialog.close());

		// Click outside (on ::backdrop) to close
		dialog.addEventListener('click', (e) => {
			if (e.target === dialog) {
				dialog.close();
			}
		});
	}

	// Global helper to open the lightbox by diagram key or object
	window.openTopologyLightbox = (diagramOrKey) => {
		const diag = typeof diagramOrKey === 'string' ? TOPOLOGY_DIAGRAMS[diagramOrKey] : diagramOrKey;
		if (!diag || !dialog) return;

		dialog.querySelector('#lightbox-title').textContent = diag.title;
		dialog.querySelector('#lightbox-subtitle').textContent = diag.subtitle;
		dialog.querySelector('#lightbox-boundary-desc').textContent = diag.boundaryDesc;
		dialog.querySelector('#lightbox-exposure-desc').textContent = diag.exposureDesc;
		dialog.querySelector('#lightbox-mechanism-desc').textContent = diag.mechanismDesc;

		// Open dialog first so it is visible in layout tree before Mermaid measures bounding boxes
		dialog.showModal();

		const lightboxMermaid = dialog.querySelector('#lightbox-mermaid');
		if (lightboxMermaid) {
			lightboxMermaid.diagram = diag.mermaid;
		}
	};

	// 3. Render the Visual Topology Gallery section right above the Controls / Results card
	const galleryMount = document.getElementById('topology-gallery-mount');
	if (galleryMount) {
		const diagrams = getGalleryDiagramsForPage(pageType);
		const isOuter = pageType === 'outer-invalidation';

		galleryMount.innerHTML = `
			<section class="topology-section" aria-label="Visual Subtest Topologies">
				<div class="topology-section-header">
					<h2>DOM Tree Topologies &amp; Shadow Boundaries</h2>
					<div class="topology-legend">
						${
							isOuter
								? `<span class="legend-item"><span class="legend-swatch swatch-invalidated"></span> Invalidated by Outer CSS</span>`
								: `<span class="legend-item"><span class="legend-swatch swatch-light"></span> Light DOM Node</span>`
						}
						<span class="legend-item"><span class="legend-swatch swatch-boundary"></span> Shadow Boundary Box</span>
						<span class="legend-item"><span class="legend-swatch swatch-shadow"></span> Shielded Shadow Node</span>
						<span class="legend-item"><span class="legend-swatch swatch-seam"></span> &lt;slot&gt; / Stylesheet</span>
					</div>
				</div>
				<div class="topology-grid">
					${diagrams
						.map(
							(d) => `
						<article class="topology-card" data-diagram-id="${escapeHTML(d.id)}" role="button" tabindex="0" aria-label="View enlarged diagram for ${escapeHTML(d.title)}">
							<div class="topology-card-header">
								<span class="topology-card-title">${escapeHTML(d.title)}</span>
								<span class="topology-zoom-pill">
									<svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.5" fill="none">
										<circle cx="11" cy="11" r="8"></circle>
										<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
										<line x1="11" y1="8" x2="11" y2="14"></line>
										<line x1="8" y1="11" x2="14" y2="11"></line>
									</svg>
									Enlarge
								</span>
							</div>
							<div class="topology-svg-preview">
								<mermaid-element class="card-mermaid" data-diagram-key="${escapeHTML(d.id)}"></mermaid-element>
							</div>
							<p class="topology-card-caption">${escapeHTML(d.subtitle)}</p>
						</article>
					`,
						)
						.join('')}
				</div>
			</section>
		`;

		// Populate each <mermaid-element> with its diagram definition
		galleryMount.querySelectorAll('mermaid-element.card-mermaid').forEach((el) => {
			const key = el.getAttribute('data-diagram-key');
			if (TOPOLOGY_DIAGRAMS[key]) {
				el.diagram = TOPOLOGY_DIAGRAMS[key].mermaid;
			}
		});

		// Attach click & keyboard handlers to cards
		galleryMount.querySelectorAll('.topology-card').forEach((card) => {
			const id = card.getAttribute('data-diagram-id');
			card.addEventListener('click', () => window.openTopologyLightbox(id));
			card.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					window.openTopologyLightbox(id);
				}
			});
		});
	}
}

/**
 * Helper to create a "View Diagram" button HTML for a table row
 */
export function renderDiagramTriggerButton(pageType, selector, description) {
	const diag = getDiagramForSubtest(pageType, selector, description);
	return `
		<button type="button" class="btn-diagram-trigger" onclick="window.openTopologyLightbox('${escapeHTML(diag.id)}')" title="Open visual topology diagram in lightbox">
			<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
				<line x1="3" y1="9" x2="21" y2="9"></line>
				<line x1="9" y1="21" x2="9" y2="9"></line>
			</svg>
			<span>Diagram</span>
		</button>
	`;
}
