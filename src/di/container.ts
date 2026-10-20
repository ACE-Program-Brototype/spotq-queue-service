import 'reflect-metadata';
import { Container } from 'inversify';
import { queueModule } from './queue.module.ts';

export const container = new Container({
	defaultScope: 'Singleton',
});

container.load(queueModule);
