import type { CustomerQueueController } from '@presentation/http/controllers/customer-queue.controller.ts';
import type { HealthController } from '@presentation/http/controllers/health.controller.ts';
import type { InternalQueueController } from '@presentation/http/controllers/internal/internal-queue.controller.ts';
import type { StaffQueueController } from '@presentation/http/controllers/staff-queue.controller.ts';
import type { StaffQueueActionsController } from '@presentation/http/controllers/staff-queue-actions.controller.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

export const healthController = container.get<HealthController>(TYPES.Controllers.HealthController);

export const staffQueueController = container.get<StaffQueueController>(
	TYPES.Controllers.StaffQueueController,
);

export const staffQueueActionsController = container.get<StaffQueueActionsController>(
	TYPES.Controllers.StaffQueueActionsController,
);

export const customerQueueController = container.get<CustomerQueueController>(
	TYPES.Controllers.CustomerQueueController,
);

export const internalQueueController = container.get<InternalQueueController>(
	TYPES.Controllers.InternalQueueController,
);
