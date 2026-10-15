import type { WalkInController } from '@presentation/http/controllers/walk-in.controller.ts';
import { container } from './container.ts';
import { TYPES } from './types.ts';

/**
 * Pre-resolved controller instances from the Inversify IoC container.
 *
 * Exposes strongly-typed singletons ready for Express router route bindings,
 * preventing manual instantiation in route definitions.
 */
export const walkInController = container.get<WalkInController>(TYPES.Controller.WalkInController);
