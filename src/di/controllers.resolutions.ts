import type { InternalQueueController } from '@presentation/http/controllers/internal-queue.controller.ts';
import type { StaffQueueController } from '@presentation/http/controllers/staff-queue.controller.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

export const staffQueueController = container.get<StaffQueueController>(
	TYPES.Controller.StaffQueueController,
);

export const internalQueueController = container.get<InternalQueueController>(
	TYPES.Controller.InternalQueueController,
);
