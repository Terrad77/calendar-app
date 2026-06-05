import { Router, type Request, type Response } from 'express';
import { env } from '../../config/env.js';

const router = Router();

router.get('/api/config', (_req: Request, res: Response): void => {
  res.json({
    isDemoMode: env.isDemoMode,
    version: env.version,
  });
});

export default router;
