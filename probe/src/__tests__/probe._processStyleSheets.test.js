var Probe = require("../probe").Probe;

describe("_processStyleSheets", () => {
	beforeEach(() => {
		Object.defineProperty(global.document, "styleSheets", {
			value: [],
			writable: true,
		});
	});

	test("should handle null href value", () => {
		document.styleSheets.push({
			href: null,
			cssRules: null,
		});

		const p = new Probe();
		var urls = p._getNewCssFileUrls();
		expect(urls).toEqual([]);
		expect(p._cssFilesURLs).toEqual([]);
	});

	test.skip("should extract url if no rules is used", () => {
		document.styleSheets.push({
			href: "https://grid.fr/a.css",
			cssRules: null,
		});

		const p = new Probe();
		var urls = p._getNewCssFileUrls();
		expect(urls).toEqual(["https://grid.fr/a.css"]);
		expect(p._cssFilesURLs).toEqual([]);
	});

	test.skip("should ignore chrome-exension url", () => {
		document.styleSheets[0] = {
			href: "https://grid.fr/a.css",
			cssRules: null,
		};

		document.styleSheets[1] = {
			href:
				"chrome-extension://kbfnbcaeplbcioakkpcpgfkobkghlhen/src/css/styl/checkbox.css",
			cssRules: null,
		};

		const p = new Probe();
		var urls = p._getNewCssFileUrls();
		expect(urls).toEqual(["https://grid.fr/a.css"]);
		expect(p._cssFilesURLs).toEqual([]);
	});
});
