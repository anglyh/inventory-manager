import express, { Router } from 'express';
import ReportController from '../controllers/report.controller.js';

const reportRouter: Router = express.Router();

reportRouter.get('/overview', ReportController.getOverview);

export default reportRouter;
