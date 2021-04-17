interface Options {
	[k: string]: any;
	pattern: string[] | null;
	url: string;
	chunkSize: number;
	debug: boolean;
	throttle: number;
}

interface SelectorRecord {
	files: string[];
	seen: boolean;
	// Is this selector found in the CSS Stylesheet
	exists: boolean;
	parent_text: string | null;
	fcn: CheckerFcn;
	checked: boolean;
}

export interface ProbeApiV1 {
	v: "0.1";
	k: string;
	f: Record<string, string[]>;
}

type CheckerFcn = (selector: string) => boolean;

export class Probe {
	private options: Options = {
		/**
		 * Where the probe are being sent
		 */
		url: "https://www.bleachcss.com/api/v1/probes/",

		pattern: null,

		/**
		 * How many Selector will be used in each chunk tests
		 */
		chunkSize: 250,

		debug: true,

		/**
		 * How frequently can the Probe check for results?
		 */
		throttle: 200,
	};

	/**
	 * Store the URL of the CSS files we have fetched, usefull to avoid reprocessing the same files
	 */
	private _cssFilesURLs: string[] = [];

	/**
	// Map of all the selectors we have found in the CSS files
	// Use following structure
	// "selector string": {
	//      files: [] -> array of files that contain the selector
	//      seen: true/false                -> indicate if the selector has been already seen
	//      fcn: document.getElementById    -> the method that will be call to detect usage of this selector
	//      parent: object                  -> point to the selector object, used to avoid checking dependent
	//                                          selector of something not in the DOM yet
	// }
	 * @type {Object<string, *>}
	 */
	private _allSelectors: Record<string, SelectorRecord> = {};

	/**
	 * Map of the selector that have not been seend in the DOM yet
	 * @type {Object<string, boolean>}
	 */
	private _unseenSelectors: Record<string, boolean> = {};

	/**
	 * List of selector that have been seen in the DOM but did not got send yet to the server.
	 */
	private _buffer: string[] = [];

	/**
	 * Timestamp of the last call to the function checking which selector are used.
	 * @type {number}
	 */
	private _timeMainLoopCall = 0;

	/**
	 * Timestamp of the AJAX request flushing the buffer
	 * @type {number}
	 */
	private _timeBufferFlushCall = 0;

	/**
	 *
	 */
	private _DOMObserv: MutationObserver | null = null;

	/**
	 * Initialize the probe and start recording usage
	 * @param {Object} userOptions User defined value for the options of the Probe
	 */
	start(userOptions: Options) {
		// Copy over options
		for (var name in userOptions) {
			this.options[name] = userOptions[name];
		}

		this.resume();
	}

	/**
	 * Stop observing DOM manipulation, but keep the state intact.
	 */
	stop() {
		if (!this._DOMObserv) {
			return;
		}
		this._DOMObserv.disconnect();
		this._DOMObserv = null;
	}

	/**
	 * Re-Start listening to DOM manipulation.
	 */
	resume() {
		var self = this;
		if (self._DOMObserv) {
			return;
		}
		self._DOMObserv = new MutationObserver(async function (mutations) {
			self._log("Mutation", mutations);
			await self._mainLoop();
		});
		self._DOMObserv.observe(document, { subtree: true, childList: true });
		self._mainLoop();
	}

	private _log(...args: any[]) {
		if (this.options.debug) {
			console.log.apply(console, args);
		}
	}

	/**
	 * Master function controlling the detection of CSS
	 */
	private async _mainLoop() {
		var self = this;
		var t1 = new Date().getTime();
		if (t1 - this._timeMainLoopCall < this.options.throttle) {
			return;
		}
		// console.profile("full detection");
		// console.time("full detection");
		this._timeMainLoopCall = t1;

		// New CSS files can be loaded dynamically.
		await this._syncSelectors();

		for (var selector in self._allSelectors) {
			self._allSelectors[selector].checked = false;
		}
		console.time("_checkSelectorsByChunk");
		this._checkSelectorsByChunk(
			Object.keys(this._unseenSelectors),
			function () {
				console.timeEnd("_checkSelectorsByChunk");
				// console.profileEnd("full detection");
				// console.timeEnd("full detection");
				var t2 = new Date().getTime();
				var PING_FREQUENCY = 500;
				if (t2 - self._timeBufferFlushCall > PING_FREQUENCY) {
					self._timeBufferFlushCall = t2;
					self._sendBuffer();
				}
			}
		);
	}

	/**
	 * Check
	 */
	private async _syncSelectors() {
		// var self = this;
		console.time("_processStyleSheets");
		var urls = this._getNewCssFileUrls();
		await this._downloadCSSFiles(urls);
		console.timeEnd("_processStyleSheets");

		// DISABLE PARSING CSS FILES, JUST RELY ON STYLESHEET OBJECT
		// var urls = this._processStyleSheets();
		// this._downloadCSSFiles(urls, function (url, text) {
		// 	self._extractSelectors(url, text);
		// 	self._mainLoop();
		// });
	}

	public _getNewCssFileUrls(): string[] {
		/** @type {any} */
		var styleSheets = document.styleSheets;
		var urlsToLoad: string[] = [];
		for (var i = 0; i < styleSheets.length; i++) {
			/** @type {CSSStyleSheet} */
			var href = styleSheets[i].href;

			// if we have not processed the file already
			if (
				href &&
				href.substr(0, 4) === "http" &&
				this._cssFilesURLs.indexOf(href) === -1
			) {
				urlsToLoad.push(href);
			}
		}
		return urlsToLoad;
	}

	/**
	 * Find used selectors from the list of unused selector we already have
	 */
	private _checkSelectorsByChunk(selectors: string[], doneCb: () => void) {
		return;
		// console.time('detect');
		var ll = selectors.length;
		var limit = ll > this.options.chunkSize ? this.options.chunkSize : ll;

		for (var i = 0; i < limit; i++) {
			this._selectorCheck(selectors.pop());
		}
		// console.timeEnd('detect');

		// Nothing else to process, return
		if (selectors.length === 0) {
			return doneCb();
		}

		// Schedule an other batch of selector to process
		var self = this;
		setTimeout(function () {
			self._checkSelectorsByChunk(selectors, doneCb);
		}, 0);
	}

	/**
	 *
	 */
	private _selectorCheck(selectorText?: string): boolean {
		if (!selectorText) return false;
		var a = this.__selectorCheck(selectorText);
		this._allSelectors[selectorText].checked = true;
		return a;
	}

	private __selectorCheck(selectorText: string): boolean {
		var item = this._allSelectors[selectorText];
		if (!item) {
			return false;
		}
		if (item.checked) {
			return item.seen;
		}

		if (item.seen) {
			return true;
		}

		if (item.parent_text) {
			// If we have not seen the parent, there is no way we can find the children
			if (!this._selectorCheck(item.parent_text)) {
				return false;
			}
		}

		try {
			if (item.fcn(selectorText)) {
				if (item.exists) {
					delete this._unseenSelectors[selectorText];
					this._buffer.push(selectorText);
				}
				item.seen = true;
				return true;
			}
		} catch (e) {
			console.warn(e);
			console.warn(
				"BleachCSS Probe encounter an error. Please file a bug https://github.com/genintho/bleachcss-probe/issues/new"
			);
		}

		return false;
	}

	/**
	 * Identify which function need to be used to check the existence of the element
	 */
	private _findChecker(selector: string): CheckerFcn {
		if (/^#[^\s]+$/.test(selector)) {
			return this._fcnCheckByID;
		}

		if (/^\.[^\s]+$/.test(selector)) {
			return this._fcnCheckClass;
		}
		// @TODO get element by tag name
		return this._fcnCheckFallback;
	}

	/**
	 * Detect if the ID is defined in the DOM
	 * @param {string} selector
	 * @return {boolean}
	 */
	private _fcnCheckByID(selector: string): boolean {
		if (document.getElementById(selector.substr(1))) {
			return true;
		}
		return false;
	}

	/**
	 * Detect if a class is defined in the DOM
	 * @param {string} selector
	 * @return {boolean}
	 */
	_fcnCheckClass(selector: string): boolean {
		if (document.getElementsByClassName(selector.substr(1)).length) {
			return true;
		}
		return false;
	}

	/**
	 * Detect if 1 DOM element is matching the selector
	 * @param {string} selector
	 * @return {boolean}
	 */
	private _fcnCheckFallback(selector: string): boolean {
		if (document.querySelector(selector)) {
			return true;
		}
		return false;
	}

	// /**
	//  * Make a GET request to try to download the CSS files
	//  */
	private async _downloadCSSFiles(stylesheetURLs: string[]) {
		return Promise.all(
			stylesheetURLs.map(
				(url): Promise<any> => {
					return fetch(
						this.options.url + "/a/1/parse?urls=" + encodeURIComponent(url)
					)
						.then((response) => response.json())
						.then((response) => {
							console.log(response);
						});
				}
			)
		);
	}

	/**
	 * Send the results to the backend
	 */
	private _sendBuffer() {
		var self = this;
		var cloneBuffer = [].concat(this._buffer);
		// Reset the buffer so we do not send the same thing again and again
		this._buffer = [];
		this._log("buffer", cloneBuffer.length, cloneBuffer);
		if (cloneBuffer.length === 0) {
			return;
		}
		var data: ProbeApiV1 = {
			v: "0.1", // API_VERSION. Use by the server to know what to do with the payload
			k: this.options.key as string,
			f: {},
		};
		cloneBuffer.forEach(function (selector) {
			var files = self._allSelectors[selector].files;
			files.forEach(function (file) {
				if (!data.f[file]) {
					data.f[file] = [];
				}
				data.f[file].push(selector);
			});
		});

		var httpRequest = new XMLHttpRequest();
		httpRequest.open("POST", self.options.url + "/a/1/report");
		httpRequest.send(JSON.stringify(data));
	}
}
