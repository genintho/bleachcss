const kue = require("kue");
const queue = kue.createQueue({
    redis: { host: process.env["REDIS_URL"] || "" },
});
import loggerFactory from "../logger";
const logger = loggerFactory("createJob");

export default function createJob(jobName, data) {
    logger.info("Create job ", jobName);
    var job = queue
        .create("gen_job", {
            job: "gen_job",
            data: {
                rawData: data,
                task: jobName,
            },
        })
        .save(function(err) {
            if (!err) {
                logger.info("New Job ", jobName, "ID", job.id);
            }
        });
}
