"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const utilsController_1 = require("../controllers/utilsController");
const router = (0, express_1.Router)();
router.get('/cep/:cep', utilsController_1.utilsController.searchCep);
exports.default = router;
