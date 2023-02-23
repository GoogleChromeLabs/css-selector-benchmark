const createElement = (tagName, options = null) => {
	const { children, parent, ...rest } = options ?? {};

	const $el = Object.assign(new HTMLElement(tagName), rest);

	if (children) {
		for (const $child of children) {
			if ($child instanceof HTMLElement) {
				$el.appendChild($child);
			}
		}
	}

	if (parent) {
		parent.appendChild($el);
	}

	return $el;
};

export { createElement };
