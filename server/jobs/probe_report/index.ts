import main from './main';
import loggerFactory from '../../lib/logger';
const logger = loggerFactory('job_probe_report');

main(
    logger, {}, () => {}
);
