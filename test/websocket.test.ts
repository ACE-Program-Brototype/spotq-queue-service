import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { initSocketServer } from '@infrastructure/websocket/socket.server.ts';
import type { SocketBroadcaster } from '@infrastructure/websocket/socket-broadcaster.ts';
import {
	WEBSOCKET_ROOMS,
	WS_CLIENT_EVENTS,
	WS_ERROR_MESSAGES,
	WS_SERVER_EVENTS,
} from '@shared/constants/websocket.constants.ts';
import { type Socket as ClientSocket, io as clientIo } from 'socket.io-client';

describe('WebSocket Infrastructure Integration Tests', () => {
	let httpServer: http.Server;
	let serverPort: number;
	let closeWsServer: () => Promise<void>;
	let broadcaster: SocketBroadcaster;

	const restaurantIdA = '11111111-1111-1111-1111-111111111111';
	const restaurantIdB = '22222222-2222-2222-2222-222222222222';
	const staffUserId = '33333333-3333-3333-3333-333333333333';
	const customerTicketId = '44444444-4444-4444-4444-444444444444';
	const customerUserId = '55555555-5555-5555-5555-555555555555';

	// Gateway trusted headers injected after JWT verification at Envoy
	const staffHeaders = {
		'x-user-id': staffUserId,
		'x-user-role': 'STAFF',
		'x-restaurant-id': restaurantIdA,
		'x-user-email': 'staff@restaurant.com',
	};

	const restaurantOwnerHeaders = {
		'x-user-id': restaurantIdA,
		'x-user-role': 'RESTAURANT_OWNER',
		'x-restaurant-id': restaurantIdA,
		'x-user-email': 'owner@restaurant.com',
	};

	const customerHeaders = {
		'x-user-id': customerUserId,
		'x-ticket-id': customerTicketId,
		'x-restaurant-id': restaurantIdA,
		'x-user-role': 'CUSTOMER',
	};

	const otherCustomerHeaders = {
		'x-user-id': '66666666-6666-6666-6666-666666666666',
		'x-ticket-id': '77777777-7777-7777-7777-777777777777',
		'x-restaurant-id': restaurantIdA,
		'x-user-role': 'CUSTOMER',
	};

	beforeAll(async () => {
		httpServer = http.createServer();
		const wsResult = await initSocketServer(httpServer, {
			useRedisAdapter: false, // In-memory adapter for unit testing
			path: '/ws',
		});
		closeWsServer = wsResult.close;
		broadcaster = wsResult.broadcaster as SocketBroadcaster;

		await new Promise<void>((resolve) => {
			httpServer.listen(0, () => {
				serverPort = (httpServer.address() as AddressInfo).port;
				resolve();
			});
		});
	});

	afterAll(async () => {
		await closeWsServer();
		await new Promise<void>((resolve) => {
			httpServer.close(() => resolve());
		});
	});

	function createClient(headers?: Record<string, string>, extraOptions = {}): ClientSocket {
		return clientIo(`http://localhost:${serverPort}`, {
			path: '/ws',
			transports: ['websocket'],
			autoConnect: false,
			extraHeaders: headers,
			...extraOptions,
		});
	}

	describe('Handshake Authentication', () => {
		it('should connect successfully with API Gateway trusted headers (staff)', (done) => {
			const client = createClient(staffHeaders);
			client.connect();

			client.on('connect', () => {
				expect(client.connected).toBe(true);
				client.disconnect();
				done();
			});

			client.on('connect_error', (err) => {
				done(err);
			});
		});

		it('should connect successfully with API Gateway trusted headers (restaurant owner)', (done) => {
			const client = createClient(restaurantOwnerHeaders);
			client.connect();

			client.on('connect', () => {
				expect(client.connected).toBe(true);
				client.disconnect();
				done();
			});

			client.on('connect_error', (err) => {
				done(err);
			});
		});

		it('should connect successfully with customer headers', (done) => {
			const client = createClient(customerHeaders);
			client.connect();

			client.on('connect', () => {
				expect(client.connected).toBe(true);
				client.disconnect();
				done();
			});

			client.on('connect_error', (err) => {
				done(err);
			});
		});

		it('customer with gateway headers and query params automatically joins queue and ticket rooms', (done) => {
			const customerId = '88888888-8888-8888-8888-888888888888';
			const client = createClient(
				{
					'x-user-id': customerId,
					'x-user-role': 'CUSTOMER',
				},
				{
					query: {
						restaurantId: restaurantIdA,
						ticketId: customerTicketId,
					},
				},
			);

			client.connect();

			client.on('connect', () => {
				client.on(WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED, (payload: { position: number }) => {
					expect(payload.position).toBe(2);
					client.disconnect();
					done();
				});

				broadcaster.sendToTicket(customerTicketId, WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED, {
					position: 2,
				});
			});
		});

		it('staff cannot spoof restaurantId via query parameter', (done) => {
			const client = createClient(staffHeaders, {
				query: {
					restaurantId: restaurantIdB,
				},
			});

			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_RESTAURANT,
					{ restaurantId: restaurantIdB },
					(res: { success: boolean; error?: string }) => {
						expect(res.success).toBe(false);
						expect(res.error).toBe(WS_ERROR_MESSAGES.UNAUTHORIZED_RESTAURANT);
						client.disconnect();
						done();
					},
				);
			});
		});

		it('should reject connection when credentials/headers are missing', (done) => {
			const client = createClient();
			client.connect();

			client.on('connect', () => {
				client.disconnect();
				done(new Error('Connection should not have succeeded without credentials'));
			});

			client.on('connect_error', (err) => {
				expect(err.message).toBe(WS_ERROR_MESSAGES.CREDENTIALS_REQUIRED);
				client.disconnect();
				done();
			});
		});
	});

	describe('Room Subscriptions & Authorization', () => {
		it('staff can join authorized restaurant room', (done) => {
			const client = createClient(staffHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_RESTAURANT,
					{ restaurantId: restaurantIdA },
					(res: { success: boolean; room?: string; error?: string }) => {
						expect(res.success).toBe(true);
						expect(res.room).toBe(WEBSOCKET_ROOMS.restaurant(restaurantIdA));
						client.disconnect();
						done();
					},
				);
			});
		});

		it('staff cannot join a restaurant room they are not assigned to', (done) => {
			const client = createClient(staffHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_RESTAURANT,
					{ restaurantId: restaurantIdB },
					(res: { success: boolean; error?: string }) => {
						expect(res.success).toBe(false);
						expect(res.error).toBe(WS_ERROR_MESSAGES.UNAUTHORIZED_RESTAURANT);
						client.disconnect();
						done();
					},
				);
			});
		});

		it('restaurant owner can join authorized restaurant room', (done) => {
			const client = createClient(restaurantOwnerHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_RESTAURANT,
					{ restaurantId: restaurantIdA },
					(res: { success: boolean; room?: string; error?: string }) => {
						expect(res.success).toBe(true);
						expect(res.room).toBe(WEBSOCKET_ROOMS.restaurant(restaurantIdA));
						client.disconnect();
						done();
					},
				);
			});
		});

		it('restaurant owner cannot join a restaurant room they are not assigned to', (done) => {
			const client = createClient(restaurantOwnerHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_RESTAURANT,
					{ restaurantId: restaurantIdB },
					(res: { success: boolean; error?: string }) => {
						expect(res.success).toBe(false);
						expect(res.error).toBe(WS_ERROR_MESSAGES.UNAUTHORIZED_RESTAURANT);
						client.disconnect();
						done();
					},
				);
			});
		});

		it('customer cannot join staff restaurant room', (done) => {
			const client = createClient(customerHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_RESTAURANT,
					{ restaurantId: restaurantIdA },
					(res: { success: boolean; error?: string }) => {
						expect(res.success).toBe(false);
						expect(res.error).toBe(WS_ERROR_MESSAGES.UNAUTHORIZED_RESTAURANT);
						client.disconnect();
						done();
					},
				);
			});
		});

		it('customer can join their own ticket room', (done) => {
			const client = createClient(customerHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_TICKET,
					{ ticketId: customerTicketId },
					(res: { success: boolean; room?: string }) => {
						expect(res.success).toBe(true);
						expect(res.room).toBe(WEBSOCKET_ROOMS.ticket(customerTicketId));
						client.disconnect();
						done();
					},
				);
			});
		});

		it('customer cannot join another customer ticket room', (done) => {
			const client = createClient(customerHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_TICKET,
					{ ticketId: '99999999-9999-9999-9999-999999999999' },
					(res: { success: boolean; error?: string }) => {
						expect(res.success).toBe(false);
						expect(res.error).toBe(WS_ERROR_MESSAGES.UNAUTHORIZED_TICKET);
						client.disconnect();
						done();
					},
				);
			});
		});

		it('customer without pre-assigned ticketId cannot hijack arbitrary ticket room', (done) => {
			const customerWithoutTicketHeaders = {
				'x-user-id': '99999999-1111-2222-3333-444444444444',
				'x-restaurant-id': restaurantIdA,
				'x-user-role': 'CUSTOMER',
			};
			const client = createClient(customerWithoutTicketHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_TICKET,
					{ ticketId: customerTicketId },
					(res: { success: boolean; error?: string }) => {
						expect(res.success).toBe(false);
						expect(res.error).toBe(WS_ERROR_MESSAGES.UNAUTHORIZED_TICKET);
						client.disconnect();
						done();
					},
				);
			});
		});

		it('customer can join and leave queue room', (done) => {
			const client = createClient(customerHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_QUEUE,
					{ queueId: restaurantIdA },
					(joinRes: { success: boolean; room?: string }) => {
						expect(joinRes.success).toBe(true);
						expect(joinRes.room).toBe(WEBSOCKET_ROOMS.queue(restaurantIdA));

						client.emit(
							WS_CLIENT_EVENTS.LEAVE_QUEUE,
							{ queueId: restaurantIdA },
							(leaveRes: { success: boolean; room?: string }) => {
								expect(leaveRes.success).toBe(true);
								client.disconnect();
								done();
							},
						);
					},
				);
			});
		});

		it('staff can join their own restaurant queue room', (done) => {
			const client = createClient(staffHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_QUEUE,
					{ queueId: restaurantIdA },
					(res: { success: boolean; room?: string }) => {
						expect(res.success).toBe(true);
						expect(res.room).toBe(WEBSOCKET_ROOMS.queue(restaurantIdA));
						client.disconnect();
						done();
					},
				);
			});
		});

		it('staff cannot join another restaurant queue room', (done) => {
			const client = createClient(staffHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(
					WS_CLIENT_EVENTS.JOIN_QUEUE,
					{ queueId: restaurantIdB },
					(res: { success: boolean; error?: string }) => {
						expect(res.success).toBe(false);
						expect(res.error).toBe(WS_ERROR_MESSAGES.UNAUTHORIZED_QUEUE);
						client.disconnect();
						done();
					},
				);
			});
		});
	});

	describe('Broadcasting via IWebSocketBroadcaster', () => {
		it('broadcastToRestaurant delivers event to restaurant room subscribers', (done) => {
			const staffClient = createClient(staffHeaders);
			const bystanderClient = createClient(otherCustomerHeaders);

			staffClient.connect();
			bystanderClient.connect();

			staffClient.on('connect', () => {
				staffClient.emit(WS_CLIENT_EVENTS.JOIN_RESTAURANT, { restaurantId: restaurantIdA }, () => {
					staffClient.on(WS_SERVER_EVENTS.QUEUE_JOINED, (payload: { guestName: string }) => {
						expect(payload.guestName).toBe('Alice');
						staffClient.disconnect();
						bystanderClient.disconnect();
						done();
					});

					bystanderClient.on(WS_SERVER_EVENTS.QUEUE_JOINED, () => {
						done(new Error('Bystander should not have received restaurant broadcast'));
					});

					broadcaster.broadcastToRestaurant(restaurantIdA, WS_SERVER_EVENTS.QUEUE_JOINED, {
						guestName: 'Alice',
					});
				});
			});
		});

		it('broadcastToRestaurant delivers event to restaurant owner subscribers', (done) => {
			const ownerClient = createClient(restaurantOwnerHeaders);

			ownerClient.connect();

			ownerClient.on('connect', () => {
				ownerClient.emit(WS_CLIENT_EVENTS.JOIN_RESTAURANT, { restaurantId: restaurantIdA }, () => {
					ownerClient.on(WS_SERVER_EVENTS.QUEUE_JOINED, (payload: { guestName: string }) => {
						expect(payload.guestName).toBe('Bob');
						ownerClient.disconnect();
						done();
					});

					broadcaster.broadcastToRestaurant(restaurantIdA, WS_SERVER_EVENTS.QUEUE_JOINED, {
						guestName: 'Bob',
					});
				});
			});
		});

		it('sendToTicket delivers private position update to ticket room', (done) => {
			const targetClient = createClient(customerHeaders);
			const bystanderClient = createClient(otherCustomerHeaders);

			targetClient.connect();
			bystanderClient.connect();

			targetClient.on('connect', () => {
				targetClient.on(
					WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED,
					(payload: { position: number }) => {
						expect(payload.position).toBe(1);
						targetClient.disconnect();
						bystanderClient.disconnect();
						done();
					},
				);

				bystanderClient.on(WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED, () => {
					done(new Error('Bystander should not receive private ticket update'));
				});

				broadcaster.sendToTicket(customerTicketId, WS_SERVER_EVENTS.QUEUE_POSITION_UPDATED, {
					position: 1,
				});
			});
		});

		it('broadcastToQueue delivers event to queue room subscribers', (done) => {
			const client = createClient(customerHeaders);
			client.connect();

			client.on('connect', () => {
				client.emit(WS_CLIENT_EVENTS.JOIN_QUEUE, { queueId: restaurantIdA }, () => {
					client.on(WS_SERVER_EVENTS.QUEUE_UPDATED, (payload: { waitTime: number }) => {
						expect(payload.waitTime).toBe(15);
						client.disconnect();
						done();
					});

					broadcaster.broadcastToQueue(restaurantIdA, WS_SERVER_EVENTS.QUEUE_UPDATED, {
						waitTime: 15,
					});
				});
			});
		});
	});

	describe('Broadcaster Getter & Redis Adapter', () => {
		it('getWebSocketBroadcaster returns active broadcaster', async () => {
			const { getWebSocketBroadcaster } = await import(
				'@infrastructure/websocket/socket.server.ts'
			);
			expect(getWebSocketBroadcaster()).toBe(broadcaster);
		});

		it('createRedisAdapter initializes clients and shuts down cleanly', async () => {
			const { createRedisAdapter } = await import('@infrastructure/websocket/redis-adapter.ts');
			const adapterResult = createRedisAdapter('redis://localhost:6379');
			expect(adapterResult.pubClient).toBeDefined();
			expect(adapterResult.subClient).toBeDefined();
			expect(adapterResult.adapter).toBeDefined();

			await expect(adapterResult.close()).resolves.toBeUndefined();
		});
	});

	describe('Configuration', () => {
		it('config reflects environment WS_USE_REDIS_ADAPTER boolean correctly', async () => {
			const { config } = await import('@infrastructure/config/index.ts');
			expect(typeof config.websocket.useRedisAdapter).toBe('boolean');
			expect(typeof config.websocket.path).toBe('string');
			expect(typeof config.websocket.corsOrigin).toBe('string');
		});
	});
});
