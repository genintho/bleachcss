import postcss from "postcss";

export function postCssExtractor(cssSrc: string): Promise<Set<string>> {
	return new Promise((resolve, reject) => {
		postcss([])
			// @ts-ignore
			.process(cssSrc, { from: undefined, hideNothingWarning: true })
			.then(function postCSSProcessResult(postCSSResult) {
				const selectors: Set<string> = new Set();
				postCSSResult.root.walkRules(function (rule) {
					if (
						rule.parent &&
						// @ts-ignore
						rule.parent.name &&
						// @ts-ignore
						rule.parent?.name.indexOf("keyframes") !== -1
					) {
						return;
					}
					rule.selectors.forEach((item) => {
						const splits = item.split(":");

						let selector = item;
						if (splits[splits.length - 1].indexOf("-child") === -1) {
							selector = splits[0];
						}
						selector = selector.trim();
						if (selector.length) {
							selectors.add(selector);
						}
					});
				});

				resolve(selectors);
			});
	});
}
