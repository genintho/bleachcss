// This file will run multiple type of jobs

import loggerFactory from "../lib/logger";
import { init as DBInit } from "../lib/db";

const logger = loggerFactory("job_runner");

// const runner_uncss = require('./uncss/main');

import runner_css_variations from "./css_variations/main";
// const runner_create_pr = require('./create_pr/main');
import runner_probe_report from "./probe_report/main";
const kue = require("kue");
const queue = kue.createQueue();

const jobDefinitions = {
    // uncss: {
    //     perform: genPerform('uncss', runner_uncss)
    // },
    css_variations: {
        perform: genPerform("css_variations", runner_css_variations),
    },
    probe_report: {
        perform: genPerform("probe_report", runner_probe_report),
    },
    // create_pr: {
    //     perform: (appId, githubToken, cb) => {
    //         const logger = loggerFactory('job_create_pr');
    //         runner_create_pr(logger, appId, githubToken, () => {})
    //             .then(() => {
    //             logger.info('done');
    //                 cb(null, true);
    //             })
    //             .catch((err) => {
    //                 logger.error(err);
    //                 cb(err);
    //             });
    //     }
    // }
};

function genPerform(name, runner) {
    return function(arg, cb) {
        const logger = loggerFactory("job_" + name);
        logger.info("Job arguments", arguments);
        runner(logger, arg, () => {})
            .then(() => {
                logger.info("Job is done");
                cb(null, true);
            })
            .catch((err) => {
                logger.error(err);
                logger.error("Job exit with error");
                cb(err);
            });
    };
}

// (async function() {
DBInit();
logger.info("Generic Job runner started");

queue.process("gen_job", function(job, done) {
    const jobData = job.data.data;
    logger.info("Process job", job.id);
    try {
        if (jobDefinitions) {
            jobDefinitions[jobData.task].perform(jobData.rawData, done);
        } else {
            logger.warn("No handler map to job", jobData.task);
            done();
        }
    } catch (e) {
        logger.error("Got Exception");
        logger.error(e);
        done();
    }
});
queue.on("error", function(err) {
    logger.error("Oops... ", err);
});
// })();

// const multiWorker = new NR.multiWorker({
//   connection: connectionDetails,
//   queues: ['node_jobs'],
//   minTaskProcessors:   1,
//   maxTaskProcessors:   10,
//   checkTimeout:        1000,
//   maxEventLoopDelay:   10,
//   toDisconnectProcessors: true,
// }, jobs);

// multiWorker.on('poll', (workerId, queue) => {
//     logger.silly("worker["+workerId+"] polling " + queue);
// });

// multiWorker.on('failure', (workerId, queue, job, failure) => {
//     logger.info("worker["+workerId+"] job failure " + queue + " " + JSON.stringify(job) + " >> " + failure);
// });

// multiWorker.on('internalError', (error) => {
//     logger.error(error);
// });

// multiWorker.on('error', (workerId, queue, job, error) => {
//     logger.info("worker["+workerId+"] error " + queue + " " + JSON.stringify(job) + " >> " + error);
// });

// // normal worker emitters
// /*
// multiWorker.on('start',             function(workerId){                      logger.info("worker["+workerId+"] started"); })
// multiWorker.on('end',               function(workerId){                      logger.info("worker["+workerId+"] ended"); })
// multiWorker.on('cleaning_worker',   function(workerId, worker, pid){         logger.info("cleaning old worker " + worker); })
// multiWorker.on('job',               function(workerId, queue, job){          logger.info("worker["+workerId+"] working job " + queue + " " + JSON.stringify(job)); })
// multiWorker.on('reEnqueue',         function(workerId, queue, job, plugin){  logger.info("worker["+workerId+"] reEnqueue job (" + plugin + ") " + queue + " " + JSON.stringify(job)); })
// multiWorker.on('success',           function(workerId, queue, job, result){  logger.info("worker["+workerId+"] job success " + queue + " " + JSON.stringify(job) + " >> " + result); })

// multiWorker.on('pause',             function(workerId){                      logger.info("worker["+workerId+"] paused"); })
// */
// // multiWorker emitters

// // multiWorker.on('multiWorkerAction', function(verb, delay){                   logger.info("*** checked for worker status: " + verb + " (event loop delay: " + delay + "ms)"); });

// multiWorker.start();

// Graceful Shutdown
// https://github.com/Automattic/kue#graceful-shutdown
process.once("SIGTERM", function(sig) {
    // queue.shutdown( 5000, function(err) {
    //     logger.warn( 'Kue shutdown: ', err||'' );
    //     process.exit( 0 );
    // });
    // multiWorker.end();
});

process.on("unhandledRejection", (reason, p) => {
    console.log("Unhandled Rejection at: Promise", p, "reason:", reason);
    // application specific logging, throwing an error, or other logic here
});
