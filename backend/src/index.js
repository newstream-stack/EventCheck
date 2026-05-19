import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import eventsRouter from './routes/events.js';
import participantsRouter from './routes/participants.js';
import { ensureBaseSheets } from './services/sheetsService.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/events/:eid/participants', participantsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? '伺服器錯誤' });
});

const PORT = process.env.PORT || 3001;

ensureBaseSheets()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch(err => { console.error('Sheets init failed:', err); process.exit(1); });
