"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agencyPointsLedgerController = void 0;
const agencyPointsLedgerService_1 = require("../services/agencyPointsLedgerService");
const agencyService_1 = require("../services/agencyService");
exports.agencyPointsLedgerController = {
    async getByAgencyId(req, res) {
        try {
            const agencyId = parseInt(req.params.agencyId);
            if (isNaN(agencyId)) {
                return res.status(400).json({ message: 'Invalid agency ID' });
            }
            const agency = await agencyService_1.agencyService.findById(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }
            const entries = await agencyPointsLedgerService_1.agencyPointsLedgerService.findByAgencyId(agencyId);
            const balance = await agencyPointsLedgerService_1.agencyPointsLedgerService.getBalance(agencyId);
            res.json({
                data: entries,
                total: entries.length,
                balance
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },
    async getBalance(req, res) {
        try {
            const agencyId = parseInt(req.params.agencyId);
            if (isNaN(agencyId)) {
                return res.status(400).json({ message: 'Invalid agency ID' });
            }
            const agency = await agencyService_1.agencyService.findById(agencyId);
            if (!agency) {
                return res.status(404).json({ message: 'Agency not found' });
            }
            const balance = await agencyPointsLedgerService_1.agencyPointsLedgerService.getBalance(agencyId);
            res.json({ agencyId, balance });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
