import { Request, Response } from 'express';
import { agencyPointsLedgerService } from '../services/agencyPointsLedgerService';

export const agencyPointsController = {
    async getPointsSummary(req: Request, res: Response) {
        try {
            // agencyId vem do middleware de autenticação
            const agencyId = req.agency?.id;

            if (!agencyId) {
                return res.status(401).json({ message: 'Agência não autenticada' });
            }

            const summary = await agencyPointsLedgerService.getPointsSummary(agencyId);

            res.json(summary);
        } catch (error) {
            console.error('Error fetching points summary:', error);
            res.status(500).json({ message: 'Erro ao buscar resumo de pontos' });
        }
    }
};
