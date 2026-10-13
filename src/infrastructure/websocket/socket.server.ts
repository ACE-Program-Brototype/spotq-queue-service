import type http from 'node:http';
import type { RedisAdapterInstances } from '@application/ports/services/redis-adapter.port.ts';
import type { IWebSocketBroadcaster } from '@application/ports/services/websocket-broadcaster.port.ts';
import { config } from '@infrastructure/config/index.ts';
import { logger } from '@infrastructure/logger/index.ts';
import { registerConnectionHandlers, socketAuthMiddleware } from '@presentation/websocket/index.ts';
import { Server, type ServerOptions } from 'socket.io';
import { createRedisAdapter } from './redis-adapter.ts';
import { SocketBroadcaster } from './socket-broadcaster.ts';

export interface WebSocketServiceOptions {
	path?: string;
	corsOrigin?: string | string[];
	useRedisAdapter?: boolean;
	redisUrl?: string;
	serverOptions?: Partial<ServerOptions>;
}

export interface WebSocketServiceResult {
	io: Server;
	broadcaster: IWebSocketBroadcaster;
	close: () => Promise<void>;
}

let activeBroadcaster: IWebSocketBroadcaster | null = null;
let activeIo: Server | null = null;

export async function initSocketServer(
	httpServer: http.Server,
	options?: WebSocketServiceOptions,
): Promise<WebSocketServiceResult> {
	const wsPath = options?.path ?? config.websocket.path;
	const corsOrigin = options?.corsOrigin ?? config.websocket.corsOrigin;
	const useRedis = options?.useRedisAdapter ?? config.websocket.useRedisAdapter;

	const io = new Server(httpServer, {
		path: wsPath,
		cors: {
			origin: corsOrigin === '*' ? true : corsOrigin,
			methods: ['GET', 'POST'],
			credentials: true,
		},
		transports: ['websocket', 'polling'],
		...options?.serverOptions,
	});

	let redisAdapterInstances: RedisAdapterInstances | undefined;

	if (useRedis) {
		try {
			redisAdapterInstances = createRedisAdapter(options?.redisUrl ?? config.redis.url);
			io.adapter(redisAdapterInstances.adapter);
			logger.info('Attached Redis Pub/Sub adapter to Socket.IO server');
		} catch (error) {
			logger.error(
				{ err: error },
				'Failed to attach Redis Pub/Sub adapter to Socket.IO, using in-memory adapter',
			);
		}
	} else {
		logger.info('WebSocket running with in-memory adapter (Redis adapter disabled)');
	}

	io.use(socketAuthMiddleware);
	registerConnectionHandlers(io);

	const broadcaster = new SocketBroadcaster(io);
	activeBroadcaster = broadcaster;
	activeIo = io;

	logger.info(
		{
			wsPath,
			transports: ['websocket', 'polling'],
			redisAdapter: Boolean(redisAdapterInstances),
		},
		'WebSocket server initialized and attached to HTTP server',
	);

	const close = async (): Promise<void> => {
		logger.info('Closing WebSocket server...');

		io.disconnectSockets(true);

		await new Promise<void>((resolve) => {
			io.close(() => {
				resolve();
			});
		});

		if (redisAdapterInstances) {
			await redisAdapterInstances.close();
		}

		if (activeIo === io) {
			activeIo = null;
			activeBroadcaster = null;
		}

		logger.info('WebSocket server closed cleanly');
	};

	return {
		io,
		broadcaster,
		close,
	};
}

export function getWebSocketBroadcaster(): IWebSocketBroadcaster {
	if (!activeBroadcaster) {
		throw new Error('WebSocket broadcaster has not been initialized');
	}
	return activeBroadcaster;
}

export function getSocketServer(): Server {
	if (!activeIo) {
		throw new Error('Socket.IO server has not been initialized');
	}
	return activeIo;
}
