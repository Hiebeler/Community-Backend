const express = require('express');
const router = express.Router();
const auth = require('../middleware/userAuth');
import type { NextFunction, Request, Response } from 'express';
import { DebtController } from '../controllers/debt.controller';
import { container } from 'tsyringe';

const debtController = container.resolve(DebtController);

router.post('/', auth, async (req: Request, res: Response, next: NextFunction) =>
  debtController.create(req, res, next),
);

router.get('/mine', auth, async (req: Request, res: Response, next: NextFunction) =>
  debtController.mine(req, res, next),
);

router.get('/balance', auth, async (req: Request, res: Response, next: NextFunction) =>
  debtController.balance(req, res, next),
);

module.exports = router;
