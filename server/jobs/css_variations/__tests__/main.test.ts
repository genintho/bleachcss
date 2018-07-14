jest.mock('../../../lib/db');
const DB = require('../../../lib/db');

jest.mock('../../../lib/insertSelectors');
const insertSelectors = require('../../../lib/insertSelectors').default;

jest.mock('../../../lib/Download');
const Download = require('../../../lib/Download');

import main from '../main';
import loggerFactory from '../../../lib/logger';

const logger = loggerFactory('test');

import {promReturn} from '../../../lib/testUtils';

const APP_Id = 3;
const CSS_VAR_ID = 2;
const CSS_FILE_ID = 44;

describe('Job css_variations main', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        DB.getCSSFileVariationByID.mockReturnValue(promReturn({
            url: 'https://www.test.com/main.css',
            application_id: APP_Id,
            css_file_id: CSS_FILE_ID
        }));
        Download.toVar.mockReturnValue(promReturn("h1{color:red;} .cc {border: 2px}"));
    });

    test('should do nothing when no new selectors are detected', async () => {
        DB.getAllSelectorsWithFilter.mockReturnValue(promReturn([
            {id: 55, selector: 'h1', mapping_state: 'no_other_mapping'},
            {id: 56, selector: '.cc', mapping_state: 'no_other_mapping'},
        ]));

        const mockCallback = jest.fn(() => {});
        return main(logger, CSS_VAR_ID, mockCallback).then(() => {
            expect(DB.getCSSFileVariationByID).toBeCalledWith(CSS_VAR_ID);
            expect(insertSelectors).toHaveBeenCalled();
            expect(DB.deleteSelectorMapping).not.toHaveBeenCalled();
            expect(DB.deleteSelector).not.toHaveBeenCalled();
            expect(mockCallback).toBeCalled();
        });
    });

    test('should detect new detector', async () => {
        DB.getAllSelectorsWithFilter.mockReturnValue(promReturn([
            {id: 55, selector: 'h1', mapping_state: 'no_other_mapping'}
        ]));

        const mockCallback = jest.fn(() => {});
        return main(logger, CSS_VAR_ID, mockCallback).then(() => {
            expect(DB.getCSSFileVariationByID).toBeCalledWith(CSS_VAR_ID);

            const m = new Map();
            m.set(CSS_FILE_ID, ['h1', '.cc']);
            expect(insertSelectors).toHaveBeenCalledWith(expect.anything(), APP_Id, m, false);
            expect(DB.deleteSelectorMapping).not.toHaveBeenCalled();
            expect(DB.deleteSelector).not.toHaveBeenCalled();
            expect(mockCallback).toBeCalled();
        });
    });

    test('should totally delete selectors that are not found in the variation', async () => {
        DB.getAllSelectorsWithFilter.mockReturnValue(promReturn([
            {id: 55, selector: '.remove', mapping_state: 'no'}
        ]));

        const mockCallback = jest.fn(() => {});
        return main(logger, CSS_VAR_ID, mockCallback).then(() => {
            expect(DB.getCSSFileVariationByID).toBeCalledWith(CSS_VAR_ID);
            expect(insertSelectors).toHaveBeenCalled();
            expect(DB.deleteSelectorMapping).toHaveBeenCalledWith(CSS_FILE_ID, 55);
            expect(DB.deleteSelector).toHaveBeenCalledWith(55);
            expect(mockCallback).toBeCalled();
        });
    });

    test('should remove a mapping of selectors that are not found in the variation', async () => {
        DB.getAllSelectorsWithFilter.mockReturnValue(promReturn([
            {id: 55, selector: '.remove', mapping_state: 'has'}
        ]));

        const mockCallback = jest.fn(() => {});
        return main(logger, CSS_VAR_ID, mockCallback).then(() => {
            expect(DB.getCSSFileVariationByID).toBeCalledWith(CSS_VAR_ID);
            expect(insertSelectors).toHaveBeenCalled();
            expect(DB.deleteSelectorMapping).toHaveBeenCalledWith(CSS_FILE_ID, 55);
            expect(DB.deleteSelector).not.toHaveBeenCalled();
            expect(mockCallback).toBeCalled();
        });
    });
});
