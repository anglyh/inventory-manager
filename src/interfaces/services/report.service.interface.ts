import type { ReportOverview } from '../../schemas/report.schema.js';

export interface IReportService {
  getOverview(
    storeId: string,
    params: {
      from?: Date | undefined;
      to?: Date | undefined;
      compareFrom?: Date | undefined;
      compareTo?: Date | undefined;
    }
  ): Promise<ReportOverview>;
}
