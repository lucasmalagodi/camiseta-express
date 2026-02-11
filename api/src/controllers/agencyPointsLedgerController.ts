import { Request, Response } from 'express';
import { agencyPointsLedgerService } from '../services/agencyPointsLedgerService';
import { agencyService } from '../services/agencyService';

export const agencyPointsLedgerController = {
    async getByAgencyId(req: Request, res: Response) {
        try {
            const agencyId = parseInt(req.params.agencyId as string);
            if (isNaN(agencyId)) {
                return res.status(400).json({ message: 'Invalid agency ID' });
            }

            const agency = await agencyService.findById(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            const entries = await agencyPointsLedgerService.findByAgencyId(agencyId);
            const balance = await agencyPointsLedgerService.getBalance(agencyId);

            res.json({ 
                data: entries, 
                total: entries.length,
                balance 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    async getBalance(req: Request, res: Response) {
        try {
            const agencyId = parseInt(req.params.agencyId as string);
            if (isNaN(agencyId)) {
                return res.status(400).json({ message: 'Invalid agency ID' });
            }

            const agency = await agencyService.findById(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }

            const balance = await agencyPointsLedgerService.getBalance(agencyId);
            res.json({ agencyId, balance });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
