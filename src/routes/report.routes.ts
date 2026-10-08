import express, { Router } from 'express';
import ReportController from '../controllers/report.controller.js';

const reportRouter: Router = express.Router();

reportRouter.get('/profit/summary', ReportController.getProfitSummary);

reportRouter.get('/profit/by-product', ReportController.getProfitByProduct);

export default reportRouter;
