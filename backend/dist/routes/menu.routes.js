"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const menu_controller_1 = require("../controllers/menu.controller");
const router = (0, express_1.Router)();
router.get('/:slug', menu_controller_1.getMenuBySlug);
exports.default = router;
