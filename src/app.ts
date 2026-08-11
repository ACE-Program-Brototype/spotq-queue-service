import {
	errorMiddleware,
	loggerMiddleware,
	metricsMiddleware,
	notFoundMiddleware,
} from '@presentation/middleware/index.ts';
import { router } from '@presentation/routes/index.routes.ts';
import { ROUTES } from '@shared/index.ts';
import express from 'express';

const app = express();

app.use(loggerMiddleware);
app.use(metricsMiddleware);
app.use(express.json());

app.use(ROUTES.ROOT, router);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
