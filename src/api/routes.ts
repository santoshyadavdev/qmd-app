import { Router } from 'express';
import { searchRouter } from './search.routes.js';
import { collectionsRouter } from './collections.routes.js';
import { indexRouter } from './index.routes.js';
import { contextRouter } from './context.routes.js';
import { settingsRouter } from './settings.routes.js';

export const apiRouter = Router();

apiRouter.use(searchRouter);
apiRouter.use(collectionsRouter);
apiRouter.use(indexRouter);
apiRouter.use(contextRouter);
apiRouter.use(settingsRouter);
