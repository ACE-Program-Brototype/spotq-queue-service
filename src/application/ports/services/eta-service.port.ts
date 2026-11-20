export interface IEtaService {
	predictEta(restaurantId: string, totalPeopleAhead: number, partySize: number): Promise<number>;
}
