import { Router } from 'express';
import { getDb } from '../../db.js';
import { users as usersTable } from '../../schema.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required', message: 'User not authenticated' });
      return;
    }

    const db = getDb();
    const rows = await db.select().from(usersTable).limit(100);

    const publicUsers = rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      // Surface jobTitle so the contacts UI can show a real role instead of a
      // generic "Collaborator" label.
      jobTitle: u.jobTitle || null,
      preferredCountry: u.preferredCountry || null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    res.json({ result: publicUsers });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
