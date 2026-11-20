export interface MlEtaTrainingEvent {
	queue_entry_id: string;
	restaurant_id: string;
	party_size: number;
	joined_at: string;
	seated_at: string;
	total_people_ahead_at_join: number;
}

export interface IRabbitMQService {
	publishToMlEta(event: MlEtaTrainingEvent): Promise<boolean>;
}
