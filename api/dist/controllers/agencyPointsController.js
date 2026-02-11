"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agencyPointsController = void 0;
const agencyPointsLedgerService_1 = require("../services/agencyPointsLedgerService");
exports.agencyPointsController = {
    async getPointsSummary(req, res) {
        try {
            // agencyId vem do middleware de autenticação
            const agencyId = req.agency?.id;
            if (!agencyId) {
                return res.status(401).json({ message: 'Agência não autenticada' });
            }
            const summary = await agencyPointsLedgerService_1.agencyPointsLedgerService.getPointsSummary(agencyId);
            res.json(summary);
        }
        catch (error) {
            console.error('Error fetching points summary:', error);
            res.status(500).json({ message: 'Erro ao buscar resumo de pontos' });
        }
    }
};
