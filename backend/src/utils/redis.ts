import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Connect automatically
(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Failed to connect to Redis. Permission caching will be disabled or fail:', error);
  }
})();

export default redisClient;
