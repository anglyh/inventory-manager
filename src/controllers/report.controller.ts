import type { NextFunction, Request, Response } from 'express';
import { reportService } from '../container.js';
import { reportOverviewQuerySchema } from '../schemas/report.schema.js';

export default class ReportController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = reportOverviewQuerySchema.parse(req.query);
      const result = await reportService.getOverview(req.user!.storeId, { from, to });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
