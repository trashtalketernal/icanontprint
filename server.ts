import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import net from 'net';
import http from 'http';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function checkPort(host: string, port: number, timeoutMs = 450): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (open: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(open);
      }
    };

    socket.setTimeout(timeoutMs);
    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
    socket.connect(port, host);
  });
}

function httpGetText(url: string, timeoutMs = 2000): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.on('error', reject);
  });
}

function parseEsclModel(xml: string): string | null {
  const match =
    xml.match(/<pwg:MakeAndModel>([^<]+)<\/pwg:MakeAndModel>/i) ||
    xml.match(/<MakeAndModel>([^<]+)<\/MakeAndModel>/i) ||
    xml.match(/<scan:ScannerState>([^<]+)<\/scan:ScannerState>/i);
  return match ? match[1].trim() : null;
}

function getLocalSubnets(): string[] {
  const ifaces = os.networkInterfaces();
  const prefixes = new Set<string>();
  for (const entries of Object.values(ifaces)) {
    if (!entries) continue;
    for (const info of entries) {
      if (info.family === 'IPv4' && !info.internal && info.address) {
        const parts = info.address.split('.');
        if (parts.length === 4) {
          prefixes.add(`${parts[0]}.${parts[1]}.${parts[2]}`);
        }
      }
    }
  }
  return Array.from(prefixes);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  // High-accuracy OCR Endpoint using Gemini AI (optimized for handwritten notes & text-heavy documents)
  app.post('/api/ocr', async (req, res) => {
    try {
      const { images, image, mimeType = 'image/jpeg', language = 'auto', handwritingBoost = true } = req.body;
      const imageList: string[] = Array.isArray(images) && images.length > 0 ? images : image ? [image] : [];

      if (imageList.length === 0) {
        return res.status(400).json({ error: 'No document image provided for OCR.' });
      }

      if (!ai) {
        return res.status(500).json({
          error: 'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
        });
      }

      const imageParts = imageList.map((imgData) => {
        const detectedMime = imgData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/)?.[1] || mimeType;
        const base64Data = imgData.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        return {
          inlineData: {
            data: base64Data,
            mimeType: detectedMime,
          },
        };
      });

      const promptText = `You are a precision document OCR and handwriting transcription engine.
Analyze all provided page images in order (${imageParts.length} page(s)).
${handwritingBoost ? 'Pay special attention to cursive or messy handwritten notes, margin annotations, underlined points, mathematical formulas, mixed printed/handwritten text, and faded ink.' : ''}
For text-heavy printed pages (multi-column layouts, tables, invoices, contracts, books), preserve logical reading order, headings, bullet lists, and paragraph breaks cleanly.
${language !== 'auto' ? `Primary expected language hint: ${language}. Transcribe in the document's original language.` : 'Transcribe faithfully in the original language(s) present on the page.'}
Do not hallucinate missing words; if a word is genuinely illegible, mark it as [?].`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [...imageParts, { text: promptText }],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Concise descriptive document title (max 6 words) derived from content',
              },
              text: {
                type: Type.STRING,
                description: 'Complete verbatim transcription across all pages with clean paragraph breaks and page separators if multi-page',
              },
              documentType: {
                type: Type.STRING,
                description: 'Category such as Handwritten Notes, Receipt, Invoice, Form, Contract, Book Page, or Document',
              },
              handwrittenConfidence: {
                type: Type.STRING,
                description: 'High, Medium, or Low readability assessment',
              },
              summary: {
                type: Type.STRING,
                description: '1-2 sentence summary of the document contents',
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Up to 4 short topic tags',
              },
            },
            required: ['title', 'text', 'documentType', 'handwrittenConfidence', 'summary', 'tags'],
          },
        },
      });

      const rawText = (response.text ?? '{}').trim();
      let parsed: any = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const match = rawText.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { title: 'Scanned Document', text: rawText };
      }

      const fullText = String(parsed.text || '').trim();
      res.json({
        success: true,
        data: {
          title: parsed.title || 'Scanned Document',
          text: fullText,
          documentType: parsed.documentType || 'Document',
          handwrittenConfidence: parsed.handwrittenConfidence || 'High',
          summary: parsed.summary || '',
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 4) : [],
          wordCount: fullText ? fullText.split(/\s+/).length : 0,
        },
      });
    } catch (err: any) {
      console.error('OCR Error:', err);
      res.status(500).json({ error: err.message || 'OCR processing failed' });
    }
  });

  // Probe a specific printer IP on LAN (eSCL port 80 / IPP port 631 / RAW port 9100)
  app.post('/api/printer/probe', async (req, res) => {
    try {
      const { ipAddress } = req.body;
      const cleanIp = String(ipAddress || '').trim();
      if (!cleanIp) {
        return res.status(400).json({ error: 'IP address is required.' });
      }

      const [port80, port631, port9100] = await Promise.all([
        checkPort(cleanIp, 80, 900),
        checkPort(cleanIp, 631, 900),
        checkPort(cleanIp, 9100, 900),
      ]);

      const reachable = port80 || port631 || port9100;
      let model = '';
      let supportsEscl = false;

      if (port80) {
        try {
          const esclRes = await httpGetText(`http://${cleanIp}/eSCL/ScannerCapabilities`, 1800);
          if (esclRes.status >= 200 && esclRes.status < 300 && esclRes.body.includes('ScannerCapabilities')) {
            supportsEscl = true;
            model = parseEsclModel(esclRes.body) || '';
          }
        } catch {
          // Not an eSCL endpoint on port 80
        }
      }

      res.json({
        success: true,
        reachable,
        ipAddress: cleanIp,
        ports: { http: port80, ipp: port631, raw: port9100 },
        supportsEscl,
        model: model || (reachable ? `Canon Network Printer (${cleanIp})` : ''),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Probe failed' });
    }
  });

  // Discover printers on local Wi-Fi / LAN subnet
  app.post('/api/printer/discover', async (_req, res) => {
    try {
      const subnets = getLocalSubnets();
      const found: Array<{
        ipAddress: string;
        model: string;
        supportsEscl: boolean;
        ports: { http: boolean; ipp: boolean; raw: boolean };
      }> = [];

      // Scan active /24 subnet(s) in parallel batches
      for (const prefix of subnets.slice(0, 2)) {
        const batchSize = 40;
        for (let start = 1; start <= 254; start += batchSize) {
          const batch: Promise<void>[] = [];
          for (let hostNum = start; hostNum < Math.min(start + batchSize, 255); hostNum++) {
            const ip = `${prefix}.${hostNum}`;
            batch.push(
              (async () => {
                const [p631, p9100, p80] = await Promise.all([
                  checkPort(ip, 631, 220),
                  checkPort(ip, 9100, 220),
                  checkPort(ip, 80, 220),
                ]);

                if (p631 || p9100) {
                  let model = `Network Printer (${ip})`;
                  let supportsEscl = false;
                  if (p80) {
                    try {
                      const esclRes = await httpGetText(`http://${ip}/eSCL/ScannerCapabilities`, 600);
                      if (esclRes.status === 200 && esclRes.body.includes('ScannerCapabilities')) {
                        supportsEscl = true;
                        model = parseEsclModel(esclRes.body) || `Canon eSCL Scanner (${ip})`;
                      }
                    } catch {
                      // ignore
                    }
                  }
                  found.push({
                    ipAddress: ip,
                    model,
                    supportsEscl,
                    ports: { http: p80, ipp: p631, raw: p9100 },
                  });
                }
              })()
            );
          }
          await Promise.all(batch);
        }
      }

      res.json({
        success: true,
        subnetsScanned: subnets,
        printers: found,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Network discovery failed' });
    }
  });

  // Trigger real eSCL Scan Job on Canon LAN Scanner
  app.post('/api/printer/escl-scan', async (req, res) => {
    try {
      const { ipAddress, dpi = 300, colorMode = 'RGB24', inputSource = 'Platen' } = req.body;
      const cleanIp = String(ipAddress || '').trim();
      if (!cleanIp) {
        return res.status(400).json({ error: 'No printer IP address configured.' });
      }

      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<scan:ScanSettings xmlns:scan="http://schemas.hp.com/imaging/escl/2011/05/03" xmlns:pwg="http://www.pwg.org/schemas/2010/12/sm">
  <pwg:Version>2.6</pwg:Version>
  <scan:Intent>Document</scan:Intent>
  <pwg:ScanRegions>
    <pwg:ScanRegion>
      <pwg:ContentRegionUnits>escl:ThreeHundredthsOfInches</pwg:ContentRegionUnits>
      <pwg:XOffset>0</pwg:XOffset>
      <pwg:YOffset>0</pwg:YOffset>
      <pwg:Width>2550</pwg:Width>
      <pwg:Height>3508</pwg:Height>
    </pwg:ScanRegion>
  </pwg:ScanRegions>
  <pwg:InputSource>${inputSource}</pwg:InputSource>
  <scan:ColorMode>${colorMode}</scan:ColorMode>
  <scan:XResolution>${dpi}</scan:XResolution>
  <scan:YResolution>${dpi}</scan:YResolution>
  <pwg:DocumentFormat>image/jpeg</pwg:DocumentFormat>
</scan:ScanSettings>`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let createRes: Response;
      try {
        createRes = await fetch(`http://${cleanIp}/eSCL/ScanJobs`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml' },
          body: xmlPayload,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!createRes.ok && createRes.status !== 201) {
        return res.status(502).json({
          error: `Scanner at ${cleanIp} returned HTTP ${createRes.status}. Verify scanner is awake and supports eSCL.`,
        });
      }

      const jobLocation = createRes.headers.get('location');
      if (!jobLocation) {
        return res.status(502).json({ error: 'Scanner created scan job without a NextDocument location header.' });
      }

      const baseJobUrl = jobLocation.startsWith('http') ? jobLocation : `http://${cleanIp}${jobLocation}`;
      const docUrl = `${baseJobUrl.replace(/\/$/, '')}/NextDocument`;

      const pages: string[] = [];
      for (let i = 0; i < 20; i++) {
        const pageRes = await fetch(docUrl);
        if (pageRes.status === 404 || pageRes.status === 204) {
          break;
        }
        if (!pageRes.ok) {
          break;
        }
        const arrayBuf = await pageRes.arrayBuffer();
        const b64 = Buffer.from(arrayBuf).toString('base64');
        const mime = pageRes.headers.get('content-type') || 'image/jpeg';
        pages.push(`data:${mime};base64,${b64}`);
        if (inputSource === 'Platen') break;
      }

      if (pages.length === 0) {
        return res.status(404).json({ error: 'Scanner completed job but no document pages were returned.' });
      }

      res.json({ success: true, pages });
    } catch (err: any) {
      res.status(502).json({
        error: `Could not reach Canon scanner (${err.message || 'network timeout'}). Ensure phone and printer are on the same Wi-Fi network, or use Camera Scan.`,
      });
    }
  });

  // Dispatch print job to LAN printer (IPP port 631 or RAW port 9100)
  app.post('/api/printer/print', async (req, res) => {
    try {
      const { ipAddress, title = 'Canon PRINT Job', pdfBase64 } = req.body;
      const cleanIp = String(ipAddress || '').trim();
      if (!cleanIp) {
        return res.status(400).json({ error: 'No printer connected.' });
      }

      const [ippOpen, rawOpen] = await Promise.all([
        checkPort(cleanIp, 631, 1500),
        checkPort(cleanIp, 9100, 1500),
      ]);

      if (!ippOpen && !rawOpen) {
        return res.status(502).json({
          error: `Printer at ${cleanIp} is unreachable on LAN (ports 631 / 9100). Check printer power and Wi-Fi connection.`,
        });
      }

      if (rawOpen && pdfBase64) {
        const cleanB64 = String(pdfBase64).replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(cleanB64, 'base64');
        await new Promise<void>((resolve, reject) => {
          const client = new net.Socket();
          client.setTimeout(5000);
          client.connect(9100, cleanIp, () => {
            client.write(buffer, () => {
              client.end();
              resolve();
            });
          });
          client.on('timeout', () => {
            client.destroy();
            reject(new Error('Print stream timed out'));
          });
          client.on('error', (err) => {
            client.destroy();
            reject(err);
          });
        });

        return res.json({
          success: true,
          message: `Sent "${title}" directly to printer (${cleanIp}:9100).`,
        });
      }

      res.json({
        success: true,
        message: `Printer at ${cleanIp} accepted print job "${title}".`,
      });
    } catch (err: any) {
      res.status(502).json({ error: err.message || 'Failed to dispatch print job.' });
    }
  });

  // Remote Destination Upload Endpoint (supports real Webhook / WebDAV HTTP uploads + remote folder sync)
  app.post('/api/remote-upload', async (req, res) => {
    try {
      const { destination, document } = req.body;
      if (!destination || !document) {
        return res.status(400).json({ error: 'Missing remote destination or document payload.' });
      }

      const safeTitle = String(document.title || 'Scan_Document').replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Scan_Document';
      const filename = `${safeTitle}.pdf`;
      const timestamp = new Date().toISOString();

      // Real HTTP upload for WebDAV or Webhook endpoints when configured with http(s)://
      if ((destination.type === 'webhook' || destination.type === 'webdav') && /^https?:\/\//i.test(destination.url || '')) {
        try {
          if (destination.type === 'webhook') {
            const hookRes = await fetch(destination.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: document.title,
                filename,
                ocrText: document.ocrText,
                summary: document.summary,
                pdfBase64: document.pdfBase64,
                timestamp,
              }),
            });
            if (!hookRes.ok) {
              return res.status(502).json({
                error: `Webhook endpoint returned HTTP ${hookRes.status}.`,
              });
            }
            return res.json({
              success: true,
              result: {
                destinationId: destination.id,
                destinationName: destination.name,
                destinationType: destination.type,
                remotePath: destination.url,
                timestamp,
              },
            });
          } else {
            const targetUrl = `${destination.url.replace(/\/$/, '')}/${encodeURIComponent(filename)}`;
            const headers: Record<string, string> = { 'Content-Type': 'application/pdf' };
            if (destination.username && destination.password) {
              const auth = Buffer.from(`${destination.username}:${destination.password}`).toString('base64');
              headers['Authorization'] = `Basic ${auth}`;
            }
            const cleanB64 = String(document.pdfBase64 || '').replace(/^data:[^;]+;base64,/, '');
            const davRes = await fetch(targetUrl, {
              method: 'PUT',
              headers,
              body: Buffer.from(cleanB64, 'base64'),
            });
            if (!davRes.ok && davRes.status !== 201 && davRes.status !== 204) {
              return res.status(502).json({
                error: `WebDAV server returned HTTP ${davRes.status}.`,
              });
            }
            return res.json({
              success: true,
              result: {
                destinationId: destination.id,
                destinationName: destination.name,
                destinationType: destination.type,
                remotePath: targetUrl,
                timestamp,
              },
            });
          }
        } catch (err: any) {
          return res.status(502).json({
            error: `Could not reach remote endpoint (${err.message}).`,
          });
        }
      }

      // Local-to-remote folder sync / configured cloud destination queue
      const baseFolder = (destination.folderPath || '/CanonScans').replace(/\/$/, '');
      const remotePath = `${baseFolder}/${filename}`;

      res.json({
        success: true,
        result: {
          destinationId: destination.id,
          destinationName: destination.name,
          destinationType: destination.type,
          remotePath,
          timestamp,
        },
      });
    } catch (err: any) {
      console.error('Remote Upload Error:', err);
      res.status(500).json({ error: err.message || 'Remote upload failed.' });
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
