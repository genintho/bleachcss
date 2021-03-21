jest.mock("../db");
const DB = require("../db");

const moment = require("moment");

import loggerFactory from "../logger";
const logger = loggerFactory("test");

import insertSelectors from "../insertSelectors";
import { promReturn } from "../testUtils";

function displayDate(m) {
	return m.format("YYYY-MM-DD HH:mm:ss");
}

const APP_ID = 2;
const CSS_FILE_ID = 15;
const SELECTOR_ID = 23;
describe("insertSelectors", () => {
	beforeEach(() => {
		jest.resetAllMocks();
	});
	test("nothing new", async () => {
		// Test that nothing happens if
		// - selector exists
		// - mapping exists
		// - seen date has been updated recently
		DB.getSelectorByName.mockReturnValue(
			promReturn([
				{
					selector: "h1",
					application_id: APP_ID,
					updated_at: displayDate(moment().subtract(4, "hour")),
					id: SELECTOR_ID,
				},
			])
		);
		const m = new Map();
		m.set(CSS_FILE_ID, ["h1"]);
		return insertSelectors(logger, APP_ID, m, true).then(() => {
			expect(DB.insertNewSelectors).not.toBeCalled();
			expect(DB.updateSelectorSeen).not.toBeCalled();
			expect(DB.insertNewSelectorMapping).not.toBeCalled();
		});
	});

	test("update seen at", async () => {
		// Test that the seen at date gets updated if
		// - selector exists
		// - mapping exists
		// - seen date has not been updated in the last day
		DB.getSelectorByName.mockReturnValue(
			promReturn([
				{
					selector: "h1",
					application_id: APP_ID,
					updated_at: displayDate(moment().subtract(1, "day")),
					id: SELECTOR_ID,
				},
			])
		);
		const m = new Map();
		m.set(CSS_FILE_ID, ["h1"]);
		return insertSelectors(logger, APP_ID, m, true).then(() => {
			expect(DB.insertNewSelectors).not.toBeCalled();
			expect(DB.updateSelectorSeen).toHaveBeenCalledWith(APP_ID, [SELECTOR_ID]);
			expect(DB.insertNewSelectorMapping).not.toBeCalled();
		});
	});

	test("create new mapping", async () => {
		// Test that a mapping gets created
		// - selector exists
		// - mapping does not exists (application_id is not defined)
		// - seen date has not been updated in the last day
		DB.getSelectorByName.mockReturnValue(
			promReturn([
				{
					selector: "h1",
					application_id: undefined,
					updated_at: displayDate(moment().subtract(1, "hour")),
					id: SELECTOR_ID,
				},
			])
		);
		const m = new Map();
		m.set(CSS_FILE_ID, ["h1"]);
		return insertSelectors(logger, APP_ID, m, true).then(() => {
			expect(DB.insertNewSelectors).not.toBeCalled();
			expect(DB.updateSelectorSeen).not.toBeCalled();
			expect(DB.insertNewSelectorMapping).toHaveBeenCalledWith(
				APP_ID,
				CSS_FILE_ID,
				[SELECTOR_ID]
			);
		});
	});

	test("create new selector", async () => {
		// Test that a mapping gets created
		// - selector exists
		// - mapping does not exists (application_id is not defined)
		// - seen date has not been updated in the last day
		DB.getSelectorByName.mockReturnValue(
			promReturn([
				{
					selector: "h1",
					application_id: APP_ID,
					updated_at: displayDate(moment().subtract(1, "hour")),
					id: SELECTOR_ID,
				},
			])
		);
		const m = new Map();
		m.set(CSS_FILE_ID, [".new"]);
		return insertSelectors(logger, APP_ID, m, true).then(() => {
			expect(DB.insertNewSelectors).toHaveBeenCalledWith(
				APP_ID,
				CSS_FILE_ID,
				[".new"],
				true
			);
			expect(DB.updateSelectorSeen).not.toBeCalled();
			expect(DB.insertNewSelectorMapping).not.toBeCalled();
		});
	});

	test("mix of all actions", async () => {
		// combine all the of the above into 1 query
		DB.getSelectorByName.mockReturnValue(
			promReturn([
				{
					selector: "h1",
					application_id: APP_ID,
					updated_at: displayDate(moment().subtract(1, "hour")),
					id: SELECTOR_ID,
				},
				{
					selector: ".missingMap",
					application_id: undefined,
					updated_at: displayDate(moment().subtract(1, "hour")),
					id: SELECTOR_ID + 1,
				},
				{
					selector: ".old",
					application_id: APP_ID,
					updated_at: displayDate(moment().subtract(25, "hour")),
					id: SELECTOR_ID + 2,
				},
				{
					selector: ".old2",
					application_id: APP_ID,
					updated_at: displayDate(moment().subtract(26, "hour")),
					id: SELECTOR_ID + 3,
				},
			])
		);
		const m = new Map();
		m.set(CSS_FILE_ID, [".new", ".missingMap"]);
		return insertSelectors(logger, APP_ID, m, true).then(() => {
			expect(DB.insertNewSelectors).toHaveBeenCalledWith(
				APP_ID,
				CSS_FILE_ID,
				[".new"],
				true
			);
			expect(DB.updateSelectorSeen).toHaveBeenCalledWith(APP_ID, [
				SELECTOR_ID + 2,
				SELECTOR_ID + 3,
			]);
			expect(DB.insertNewSelectorMapping).toHaveBeenCalledWith(
				APP_ID,
				CSS_FILE_ID,
				[SELECTOR_ID + 1]
			);
		});
	});
});
