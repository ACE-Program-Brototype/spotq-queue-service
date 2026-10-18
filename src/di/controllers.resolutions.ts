import type { CustomerQueueController } from '@presentation/http/controllers/customer-queue.controller.ts';
import type { StaffQueueController } from '@presentation/http/controllers/staff-queue.controller.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

export const staffQueueController = container.get<StaffQueueController>(
	TYPES.Controller.StaffQueueController,
);

export const customerQueueController = container.get<CustomerQueueController>(
	TYPES.Controller.CustomerQueueController,
);
