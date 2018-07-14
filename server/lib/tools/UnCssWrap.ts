const uncss = require('uncss');

export function analyzeAppAtUrl(logger, url: string): Promise<string> {
    const options = {
        report: true,
    };
    logger.info('Start running uncss for "%s"', url);
    return new Promise<string>((resolve, reject) => {
        uncss([url], options, function (error, output) {
            logger.info('Finished running uncss');
            logger.debug('uncss output', output)
            if (error) {
                logger.error('uncss error', error);
                reject(error);
            }
            resolve(output);
        });
    });
}
