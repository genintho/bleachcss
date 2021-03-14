// NOT USED IN PRODUCTION

import main from './main';
import loggerFactory from '../../lib/logger';

try {
    main(
        loggerFactory('job_css_variations'),
        5,
        () => {}
    );
} catch(e) {
    console.log(e);
}
