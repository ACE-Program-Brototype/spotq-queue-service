import 'reflect-metadata';
import { Container } from 'inversify';
import { internalModule } from './modules/internal.module.ts';
import { queueModule } from './modules/queue.module.ts';

export const container = new Container({
	defaultScope: 'Singleton',
});

container.load(queueModule, internalModule);
