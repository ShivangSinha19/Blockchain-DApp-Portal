import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const upload = multer();
const pinataCfg = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'server/config/pinata.config.json'), 'utf8')
);
const PINATA_JWT = process.env[pinataCfg.pinata.jwtEnvKey];

function assertAuth() {
  if (!PINATA_JWT) throw new Error('Missing PINATA_JWT in environment.');
}

router.post('/pinFile', upload.single('file'), async (req, res) => {
  try {
    assertAuth();
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const formData = new FormData();
    formData.append('file', new Blob([req.file.buffer]), req.file.originalname);

    const r = await fetch(pinataCfg.pinata.endpoints.pinFile, {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: formData
    });

    const data = await r.json();
    if (!data.IpfsHash) return res.status(502).json({ error: 'Pin failed', raw: data });
    res.json({ cid: data.IpfsHash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/pinJSON', express.json(), async (req, res) => {
  try {
    assertAuth();
    const payload = req.body || {};
    const r = await fetch(pinataCfg.pinata.endpoints.pinJSON, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`
      },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!data.IpfsHash) return res.status(502).json({ error: 'Pin failed', raw: data });
    res.json({ cid: data.IpfsHash });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;