jest.mock('../../../lib/db');
const DB = require('../../../lib/db');

jest.mock('../../../lib/insertSelectors');
const insertSelectors = require('../../../lib/insertSelectors').default;

jest.mock('../../../lib/syncCssFiles');
const syncCssFiles = require('../../../lib/syncCssFiles').default;

import main from '../main';
import loggerFactory from '../../../lib/logger';

const logger = loggerFactory('test');

import {promReturn} from '../../../lib/testUtils';

const APP_ID = 2;
const FILE_ID = 15;

describe('probe_report main', () =>{
    describe('v0.1', () => {
        test('to throw if variations are not matching', async () => {
            expect.assertions(1);
            const payload = {
                v: '0.1',
                k: 'aaa',
                f: {
                    'https://www.test.com/css/main.css': ['html', '.so']
                }
            };

            syncCssFiles.mockReturnValue(promReturn([]));
            DB.getApp.mockReturnValue(promReturn({url:"http://www.test.com"}));
            const mockCallback = jest.fn(() => {});
            return main(logger, JSON.stringify(payload), mockCallback).catch(e => {
                expect(e).toBeDefined();
            });
        });

        test('should work', async () => {
            const selectors = ['html', '.so'];
            const payload = {
                v: '0.1',
                k: 'aaa',
                f: {
                    'https://www.test.com/css/main.css': selectors
                }
            };
            DB.getAppIdByKey.mockReturnValue(promReturn(APP_ID));

            syncCssFiles.mockReturnValue(promReturn([{
                url: 'https://www.test.com/css/main.css',
                app_id: APP_ID,
                css_file_id: FILE_ID
            }]));

            insertSelectors.mockReturnValue(promReturn([]));
            const mockCallback = jest.fn(() => {});
            return main(logger, JSON.stringify(payload), mockCallback).then(() => {
                expect(syncCssFiles).toBeCalledWith(expect.anything(), APP_ID, ['https://www.test.com/css/main.css']);

                const m = new Map();
                m.set(FILE_ID, selectors);
                expect(insertSelectors).toBeCalledWith(logger, APP_ID, m, true);
                expect(mockCallback).toBeCalled();
            });
        });
    });
});
