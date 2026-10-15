import 'reflect-metadata';
import { Container } from 'inversify';
import { queueModule } from './queue.module.ts';

/**
 * Root Inversify Dependency Injection Container for spotq-queue-service.
 *
 * Configured with default Singleton scope to guarantee efficient resource utilization
 * and single instance lifecycles across database pools, Redis connections, and HTTP controllers.
 */
export const container = new Container({
	defaultScope: 'Singleton',
});

container.load(queueModule);
