import type { IGetCustomerQueueStatusUseCase } from '@application/ports/use-cases/internal/get-customer-queue-status.use-case.port';
import { GetCustomerQueueStatusUseCase } from '@application/use-cases/internal/get-customer-queue-status.use-case';
import { TYPES } from '@di/types';
import { ContainerModule } from 'inversify';

export const internalModule = new ContainerModule(({ bind }) => {
	bind<IGetCustomerQueueStatusUseCase>(TYPES.UseCases.Internal.GetCustomerQueueStatusUseCase)
		.to(GetCustomerQueueStatusUseCase)
		.inSingletonScope();
});
