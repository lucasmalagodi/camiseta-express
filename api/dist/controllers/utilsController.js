"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utilsController = void 0;
const cepService_1 = require("../services/cepService");
exports.utilsController = {
    async searchCep(req, res) {
        try {
            const cep = req.params.cep;
            if (!cep) {
                return res.status(400).json({ message: 'CEP is required' });
            }
            // Validar formato básico (deve conter apenas números e hífen)
            const cepPattern = /^[\d-]+$/;
            if (!cepPattern.test(cep)) {
                return res.status(400).json({ message: 'Invalid CEP format' });
            }
            const result = await cepService_1.cepService.searchCep(cep);
            res.json(result);
        }
        catch (error) {
            if (error instanceof Error) {
                if (error.message === 'Invalid CEP format') {
                    return res.status(400).json({ message: error.message });
                }
                if (error.message === 'CEP_NOT_FOUND') {
                    return res.status(404).json({
                        found: false,
                        message: 'CEP not found'
                    });
                }
                if (error.message === 'EXTERNAL_SERVICE_ERROR' || error.message === 'EXTERNAL_SERVICE_TIMEOUT') {
                    return res.status(502).json({ message: 'External service unavailable' });
                }
            }
            console.error('CEP search error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};
