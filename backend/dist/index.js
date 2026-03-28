"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const upload_1 = __importDefault(require("./upload"));
const databaseRoutes_1 = __importDefault(require("./databaseRoutes"));
const env_1 = require("./env");
(0, env_1.ensureLocalEnvLoaded)();
const app = (0, express_1.default)();
const publicDir = path_1.default.resolve(__dirname, '..', 'public');
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '25mb' }));
app.use(express_1.default.static(publicDir));
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(publicDir, 'index.html'));
});
app.use(upload_1.default);
app.use(databaseRoutes_1.default);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
});
