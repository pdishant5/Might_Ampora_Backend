import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function testRedisConnection() {
    try {
        const reply = await redis.ping();
        if (reply === "PONG") {
            console.log(" Redis connection successful (PING/PONG).");
        } else {
            console.warn("Redis connection test returned:", reply);
        }
    } catch (error) {
        console.error(" Failed to connect to Redis:", error.message);
    }
}

// Run the test
testRedisConnection();

export default redis;
