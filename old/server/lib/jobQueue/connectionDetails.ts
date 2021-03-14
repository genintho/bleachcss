const Redis = require("ioredis");

const redisClient = new Redis({
    host: "127.0.0.1",
    password: null,
    port: 6379,
    database: 0,
    // namespace: 'resque',
    // looping: true,
    // options: {password: 'abc'},
});

export default {
    redis: redisClient,
};
