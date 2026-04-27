import type { NextFunction, Request, Response } from 'express';
import { reportService } from '../container.js';
import {
  profitByProductQuerySchema,
  profitSummaryQuerySchema,
} from '../schemas/report.schema.js';

export default class ReportController {
  static async getProfitSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = profitSummaryQuerySchema.parse(req.query);
      const result = await reportService.getProfitSummary(req.user!.userId, { from, to });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  static async getProfitByProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to, limit } = profitByProductQuerySchema.parse(req.query);
      const result = await reportService.getProfitByProduct(req.user!.userId, {
        from,
        to,
        limit,
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
