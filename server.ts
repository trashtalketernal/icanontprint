import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize Google Gen AI
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // OCR Endpoint using Gemini AI
  app.post('/api/ocr', async (req, res) => {
    try {
      const { image, mimeType = 'image/jpeg' } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'No image provided' });
      }

      if (!ai) {
        return res.status(500).json({ 
          error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in secrets.' 
        });
      }

      // Clean base64 header if present
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '');

      const prompt = `You are an expert OCR and document intelligence engine specialized in recognizing handwritten notes, lecture notes, receipts, forms, and text-heavy printed documents.
Analyze this document page carefully. Provide the response strictly in JSON format with the following keys:
{
  "title": "A short, descriptive auto-generated title for the document (max 6 words)",
  "text": "The full transcribed text, preserving paragraph breaks and readability",
  "handwrittenConfidence": "High, Medium, or Low depending on handwriting clarity",
  "documentType": "Handwritten Notes, Invoice, Receipt, Contract, Form, or General Document",
  "summary": "A 1-2 sentence summary of the contents",
  "tags": ["array", "of", "relevant", "tags"],
  "wordCount": 120
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          prompt
        ]
      });

      const rawText = response.text || '';
      let jsonResult = {};
      try {
        const jsonMatch = rawText.match(/```json([\s\S]*?)```/) || rawText.match(/\{[\s\S]*\}/);
        const cleanJsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawText;
        jsonResult = JSON.parse(cleanJsonStr);
      } catch (e) {
        jsonResult = {
          title: 'Scanned Document',
          text: rawText,
          handwrittenConfidence: 'Medium',
          documentType: 'General Document',
          summary: 'Extracted via Gemini AI OCR',
          tags: ['Scanned', 'OCR'],
          wordCount: rawText.split(/\s+/).length
        };
      }

      res.json({ success: true, data: jsonResult });
    } catch (err: any) {
      console.error('OCR Error:', err);
      res.status(500).json({ error: err.message || 'OCR processing failed' });
    }
  });

  // Remote Destination Upload Simulation Endpoint
  app.post('/api/remote-upload', async (req, res) => {
    try {
      const { destinationType, destinationConfig, document } = req.body;
      if (!destinationType || !document) {
        return res.status(400).json({ error: 'Missing destination type or document data' });
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));

      const remoteId = `rem_${Math.random().toString(36).substring(2, 9)}`;
      const timestamp = new Date().toISOString();

      let responseDetails = {
        remoteId,
        destinationType,
        timestamp,
        status: 'SUCCESS',
        remotePath: '',
        message: ''
      };

      switch (destinationType) {
        case 'googledrive':
          responseDetails.remotePath = `/My Drive/Canon Scans/${document.title || 'Document'}.pdf`;
          responseDetails.message = `Successfully uploaded to Google Drive (${destinationConfig.account || 'user@gmail.com'})`;
          break;
        case 'dropbox':
          responseDetails.remotePath = `/Apps/CanonPrint/${document.title || 'Document'}.pdf`;
          responseDetails.message = `Successfully synced to Dropbox folder`;
          break;
        case 'webdav':
          responseDetails.remotePath = `${destinationConfig.url || 'https://dav.cloud.com'}/${document.title || 'Document'}.pdf`;
          responseDetails.message = `Uploaded via WebDAV to server`;
          break;
        case 'sftp':
          responseDetails.remotePath = `sftp://${destinationConfig.host || 'transfer.server.com'}:22/scans/${document.title || 'Document'}.pdf`;
          responseDetails.message = `Transferred via SFTP securely`;
          break;
        case 'webhook':
          responseDetails.remotePath = destinationConfig.url || 'https://webhook.site/target';
          responseDetails.message = `Dispatched JSON payload & PDF blob to webhook endpoint`;
          break;
        default:
          responseDetails.remotePath = `/cloud/storage/${document.title || 'Document'}.pdf`;
          responseDetails.message = `Uploaded to remote cloud storage`;
      }

      res.json({ success: true, result: responseDetails });
    } catch (err: any) {
      console.error('Remote Upload Error:', err);
      res.status(500).json({ error: err.message || 'Remote upload failed' });
    }
  });

  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);

  if (process.env.NODE_ENV === 'production' && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
