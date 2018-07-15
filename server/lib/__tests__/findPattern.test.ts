import findPattern from "../findPattern";
const testData = require("./patternUrls").default;
import loggerFactory from "../../logger";
const logger = loggerFactory("test");

test("findPattern should work", () => {
    expect(
        testData.map((url) => {
            return findPattern(url);
        })
    ).toMatchSnapshot();
});
