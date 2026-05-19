import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSheetData, updateRow } from '../services/sheetsService.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '請提供 email 和密碼' });

  const users = await getSheetData('users');
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Email 或密碼錯誤' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Email 或密碼錯誤' });

  const token = jwt.sign(
    { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
});

router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: '請提供目前密碼和新密碼' });

  const users = await getSheetData('users');
  const idx = users.findIndex(u => u.user_id === req.user.user_id);
  if (idx === -1) return res.status(404).json({ error: '使用者不存在' });

  const valid = await bcrypt.compare(currentPassword, users[idx].password_hash);
  if (!valid) return res.status(401).json({ error: '目前密碼錯誤' });

  const hash = await bcrypt.hash(newPassword, 10);
  const u = users[idx];
  await updateRow('users', idx + 1, [u.user_id, u.name, u.email, hash, u.role, u.created_at]);

  res.json({ message: '密碼已更新' });
});

export default router;
