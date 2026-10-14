export interface IWebSocketBroadcaster {
	broadcastToRestaurant<T = unknown>(restaurantId: string, event: string, data: T): void;
	broadcastToQueue<T = unknown>(queueId: string, event: string, data: T): void;
	sendToTicket<T = unknown>(ticketId: string, event: string, data: T): void;
}
