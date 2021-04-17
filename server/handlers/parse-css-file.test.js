const { process, extract_parents } = require("./parse-css-file");
import { postCssExtractor } from "../lib/postCssExtractor";
import { process_css_file } from "./process_css_file";
jest.mock("./process_css_file");

import * as path from "path";
import * as fs from "fs";

//@ts-ignore
const testInputs = {
	".a": [],
	".a.b": [],
	".a.b.c": [],

	".a .b": [".a"],
	".a .b .c": [".a .b", ".a"],
	".a.b .c": [".a.b"],
	".a .b.c": [".a"],

	".a > .b": [".a"],
	".a > .b > .c": [".a > .b", ".a"],

	".a ~ .b": [".a"],
	".a ~ .b~.c": [".a ~ .b", ".a"],

	".a + .b": [".a"],
	".a + .b + .c": [".a + .b", ".a"],
	".a + .b ~ .c": [".a + .b", ".a"],

	".a+.b ~ .c.d > .e": [".a+.b ~ .c.d", ".a+.b", ".a"],
};

describe("extract_parents", () => {
	Object.keys(testInputs).forEach((selector, idx) => {
		test(selector, () => {
			const expectedParentSelector = testInputs[selector];
			const ret = extract_parents(selector);
			expect(ret).toEqual(expectedParentSelector);
		});
	});
});

describe("Payload generation", () => {
	var dataFolder = path.resolve(__dirname, "real_site_example");
	var files = fs.readdirSync(dataFolder);
	files.forEach(async (file) => {
		test(file, async () => {
			var srcpath = path.resolve(__dirname, "real_site_example", file);
			var cssSrc = fs.readFileSync(srcpath, { encoding: "utf-8" });
			const selectors = await postCssExtractor(cssSrc);
			// process_css_file.mock;
			process_css_file.mockImplementation(() => Promise.resolve(selectors));
			expect(await process("aaa")).toMatchSnapshot();
		});
	});
});
