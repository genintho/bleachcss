import { findPattern } from "./findPattern";
import testData from "./__snapshots__/patternUrls";

test("findPattern should work", () => {
	expect(
		testData.map((url) => {
			return findPattern(url);
		})
	).toMatchSnapshot();
});
