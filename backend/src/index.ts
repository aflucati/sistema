import express from 'express';
import cors from 'cors';
import path from 'path';
import uploadRouter from './upload';
import databaseRouter from './databaseRoutes';
import { ensureLocalEnvLoaded } from './env';

ensureLocalEnvLoaded();
const app = express();
const publicDir = path.resolve(__dirname, '..', 'public');

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(publicDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(uploadRouter);
app.use(databaseRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
