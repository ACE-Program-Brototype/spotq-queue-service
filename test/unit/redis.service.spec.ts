import { REDIS_STATUS, RedisService } from '@infrastructure/redis/redis.service.ts';
import type Redis from 'ioredis';

describe('RedisService Unit Tests', () => {
	let mockRedisClient: jest.Mocked<Partial<Redis>>;
	let service: RedisService;

	beforeEach(() => {
		mockRedisClient = {
			status: REDIS_STATUS.WAIT,
			connect: jest.fn().mockResolvedValue(undefined),
			quit: jest.fn().mockResolvedValue('OK'),
			ping: jest.fn().mockResolvedValue('PONG'),
		};
		service = new RedisService(mockRedisClient as unknown as Redis);
	});

	describe('connect', () => {
		it('should call client.connect() when status is wait', async () => {
			mockRedisClient.status = REDIS_STATUS.WAIT;
			await service.connect();
			expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
		});

		it('should NOT call client.connect() when status is connecting', async () => {
			mockRedisClient.status = REDIS_STATUS.CONNECTING;
			await service.connect();
			expect(mockRedisClient.connect).not.toHaveBeenCalled();
		});

		it('should NOT call client.connect() when status is connect', async () => {
			mockRedisClient.status = REDIS_STATUS.CONNECT;
			await service.connect();
			expect(mockRedisClient.connect).not.toHaveBeenCalled();
		});

		it('should NOT call client.connect() when status is ready', async () => {
			mockRedisClient.status = REDIS_STATUS.READY;
			await service.connect();
			expect(mockRedisClient.connect).not.toHaveBeenCalled();
		});

		it('should NOT call client.connect() when status is reconnecting', async () => {
			mockRedisClient.status = REDIS_STATUS.RECONNECTING;
			await service.connect();
			expect(mockRedisClient.connect).not.toHaveBeenCalled();
		});

		it('should NOT call client.connect() when status is close', async () => {
			mockRedisClient.status = REDIS_STATUS.CLOSE;
			await service.connect();
			expect(mockRedisClient.connect).not.toHaveBeenCalled();
		});

		it('should NOT call client.connect() when status is end', async () => {
			mockRedisClient.status = REDIS_STATUS.END;
			await service.connect();
			expect(mockRedisClient.connect).not.toHaveBeenCalled();
		});
	});

	describe('disconnect', () => {
		it('should call quit() when client is ready', async () => {
			mockRedisClient.status = REDIS_STATUS.READY;
			await service.disconnect();
			expect(mockRedisClient.quit).toHaveBeenCalledTimes(1);
		});

		it('should call quit() when client is connecting', async () => {
			mockRedisClient.status = REDIS_STATUS.CONNECTING;
			await service.disconnect();
			expect(mockRedisClient.quit).toHaveBeenCalledTimes(1);
		});

		it('should call quit() when client is reconnecting', async () => {
			mockRedisClient.status = REDIS_STATUS.RECONNECTING;
			await service.disconnect();
			expect(mockRedisClient.quit).toHaveBeenCalledTimes(1);
		});

		it('should NOT call quit() when client is wait', async () => {
			mockRedisClient.status = REDIS_STATUS.WAIT;
			await service.disconnect();
			expect(mockRedisClient.quit).not.toHaveBeenCalled();
		});

		it('should NOT call quit() when client is end', async () => {
			mockRedisClient.status = REDIS_STATUS.END;
			await service.disconnect();
			expect(mockRedisClient.quit).not.toHaveBeenCalled();
		});

		it('should NOT call quit() when client is close', async () => {
			mockRedisClient.status = REDIS_STATUS.CLOSE;
			await service.disconnect();
			expect(mockRedisClient.quit).not.toHaveBeenCalled();
		});
	});

	describe('isHealthy', () => {
		it('should return true when ping returns PONG', async () => {
			(mockRedisClient.ping as jest.Mock).mockResolvedValueOnce('PONG');
			const result = await service.isHealthy();
			expect(result).toBe(true);
		});

		it('should return false when ping rejects', async () => {
			(mockRedisClient.ping as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));
			const result = await service.isHealthy();
			expect(result).toBe(false);
		});
	});
});
