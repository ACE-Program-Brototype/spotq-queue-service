import type { createAdapter } from '@socket.io/redis-adapter';
import type IORedis from 'ioredis';

export interface RedisAdapterInstances {
	pubClient: IORedis;
	subClient: IORedis;
	adapter: ReturnType<typeof createAdapter>;
	close: () => Promise<void>;
}
