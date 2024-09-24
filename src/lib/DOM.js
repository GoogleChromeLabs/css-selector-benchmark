/**
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const createElement = (tagName, options = null) => {
	const { children, ...rest } = options ?? {};

	const $el = Object.assign(document.createElement(tagName), rest);

	if (children) {
		for (const $child of children) {
			if ($child instanceof HTMLElement) {
				$el.appendChild($child);
			}
		}
	}

	return $el;
};

export { createElement };
