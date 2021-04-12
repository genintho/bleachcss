import * as _ from "lodash";
import { LIBRARIES } from "./findPublicLibrary";
import { findPublicLibrary } from "./findPublicLibrary";

describe("findPublicLibrary", () => {
	LIBRARIES.forEach((known) => {
		describe("pattern:" + known.pattern, () => {
			_.forEach(known.examples, (urlTest, key) => {
				test("url: " + urlTest, () => {
					// @ts-ignore
					const result = findPublicLibrary(urlTest);
					if (result === null) {
						expect(result).not.toBeNull();
						return;
					}
					// @ts-ignore
					if (known.nameFromRegExp) {
						expect(result.name).toBe(key + " " + known.name);
					} else {
						expect(result.name).toBe(known.name);
					}
					expect(result.pattern).toBe(known.pattern);
				});
			});
		});
	});

	test("should return null if no match", () => {
		const result = findPublicLibrary("http://wwww.google.com");
		expect(result).toBeNull();
	});
});
