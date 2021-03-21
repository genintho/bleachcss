jest.mock("../../db");

jest.mock("../../jobQueue/createJob");
const createJob = require("../../jobQueue/createJob").default;

import PublicLibraryPatterns from "../PublicLibraryPatterns";
import loggerFactory from "../../logger";
import { promReturn } from "../../testUtils";
import syncCssFiles from "../index";
const DB = require("../../db");

const APP_ID = 987655;
const CSS_HOME = "http://uncss.io/home.ABC.css";
const ID_MATCH = 15;

describe("syncCSSFile", () => {
	beforeEach(() => {
		jest.resetAllMocks();

		// We have 1 existing variations
		DB.getCSSFilesVariationsByUrls.mockImplementation((appId, urls) => {
			const ret: any = [];
			if (urls.includes(CSS_HOME)) {
				ret.push({ id: 1111, css_file_id: 13, url: CSS_HOME });
			}
			return promReturn(ret);
		});

		// Create a fake config
		DB.getAppFiles.mockReturnValue(
			promReturn([
				{ id: 14, name: "@@INLINE@@", pattern: "" },
				{ id: ID_MATCH, name: "app.css", pattern: "app.[A-Z]{4}.css" },
			])
		);

		// Kill queue interactions
		createJob.mockReturnValue(null);
	});

	test("do nothing when all variation exists", async () => {
		const urls = [CSS_HOME];
		return syncCssFiles(loggerFactory("test"), APP_ID, urls).then(
			(variations) => {
				expect(
					variations.map((v) => {
						return v.url;
					})
				).toEqual(urls);
				expect(DB.insertCssFileVariation).not.toBeCalled();
				expect(DB.insertCssFileDefinition).not.toHaveBeenCalled();
				expect(createJob).not.toBeCalled();
			}
		);
	});

	test("match variation to pattern", async () => {
		const testUrl = "http://uncss.io/app.ACFG.css";
		const newId = 123;
		DB.insertCssFileVariation.mockReturnValue(
			promReturn({
				id: newId,
				application_id: APP_ID,
				css_file_id: ID_MATCH,
				url: testUrl,
			})
		);

		const urls = [testUrl];

		return syncCssFiles(loggerFactory("test"), APP_ID, urls).then(
			(variations) => {
				expect(
					variations.map((v) => {
						return v.url;
					})
				).toEqual(urls);
				expect(DB.insertCssFileVariation).toHaveBeenCalledWith(
					APP_ID,
					ID_MATCH,
					testUrl
				);
				expect(DB.insertCssFileDefinition).not.toHaveBeenCalled();
				expect(createJob).toBeCalledWith("css_variations", newId);
			}
		);
	});

	test("match variation to unclassified", async () => {
		const urlTest = "http://uncss.io/bob.123.css";

		const cssFileId = 345;
		const expectedName = "uncss.<domain>/bob.123.css";
		const expectedPattern =
			"uncss(.(ac|co|com|edu|gov|me|net|org))?.[^./]+/bob\\.123\\.css";
		DB.insertCssFileDefinition.mockReturnValue(
			promReturn({
				id: cssFileId,
				pattern: expectedPattern,
				name: expectedName,
			})
		);

		const variationId = 222;
		DB.insertCssFileVariation.mockReturnValue(
			promReturn({
				id: variationId,
				application_id: APP_ID,
				css_file_id: cssFileId,
				url: urlTest,
			})
		);

		const urls = [urlTest];

		return syncCssFiles(loggerFactory("test"), APP_ID, urls).then(
			(variations) => {
				expect(
					variations.map((v) => {
						return v.url;
					})
				).toEqual(urls);
				expect(DB.insertCssFileVariation).toHaveBeenCalledWith(
					APP_ID,
					cssFileId,
					"http://uncss.io/bob.123.css"
				);
				expect(DB.insertCssFileDefinition).toHaveBeenCalledWith(
					APP_ID,
					expectedName,
					expectedPattern
				);
				expect(createJob).toBeCalledWith("css_variations", variationId);
			}
		);
	});

	describe("match list of known file", () => {
		test("url: " + PublicLibraryPatterns[0].name, () => {
			const newId = 2222;
			const libUrl = PublicLibraryPatterns[0].examples[0];
			const libPattern = PublicLibraryPatterns[0].pattern;
			const libName = PublicLibraryPatterns[0].name;

			const cssFileId = 345;
			DB.insertCssFileDefinition.mockReturnValue(
				promReturn({
					id: cssFileId,
					pattern: libPattern,
					name: libName,
				})
			);

			DB.insertCssFileVariation.mockReturnValue(
				promReturn({
					id: newId,
					application_id: APP_ID,
					css_file_id: cssFileId,
					url: libUrl,
				})
			);

			const urls = [libUrl];

			return syncCssFiles(loggerFactory("test"), APP_ID, urls).then(
				(variations) => {
					expect(
						variations.map((v) => {
							return v.url;
						})
					).toEqual(urls);
					expect(DB.insertCssFileVariation).toHaveBeenCalledWith(
						APP_ID,
						cssFileId,
						libUrl
					);
					expect(DB.insertCssFileDefinition).toHaveBeenCalledWith(
						APP_ID,
						libName,
						libPattern
					);
					expect(createJob).toBeCalledWith("css_variations", newId);
				}
			);
		});
	});
});
