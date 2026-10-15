import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { YoutubeTranscript } from 'youtube-transcript'

const youtubeTranscriptApi = (): Plugin => ({
  name: 'youtube-transcript-api',
  configureServer(server) {
    server.middlewares.use('/api/yt-transcript', async (req, res, next) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const videoId = url.searchParams.get('videoId');
      if (videoId) {
        try {
          const transcript = await YoutubeTranscript.fetchTranscript(videoId);
          const text = transcript.map(t => t.text).join(' ');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, text }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      } else {
        next();
      }
    });
  }
})

const webScraperApi = (): Plugin => ({
  name: 'web-scraper-api',
  configureServer(server) {
    server.middlewares.use('/api/scrape', async (req, res, next) => {
      const urlParam = new URL(req.url || '', `http://${req.headers.host}`).searchParams.get('url');
      if (urlParam) {
        try {
          const fetchRes = await fetch(urlParam);
          const html = await fetchRes.text();
          
          // Use dynamic import since cheerio is ESM
          const cheerio = await import('cheerio');
          const $ = cheerio.load(html);
          
          // Remove scripts, styles, noscript, etc.
          $('script, style, noscript, nav, footer, iframe, svg').remove();
          
          // Extract text and clean up whitespace
          const text = $('body').text().replace(/\s+/g, ' ').trim();
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, text }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      } else {
        next();
      }
    });
  }
})

// ── Gemini File Upload Proxy (bypasses CORS for large file uploads) ──────
const geminiFileUploadProxy = (): Plugin => ({
  name: 'gemini-file-upload-proxy',
  configureServer(server) {
    // Step 1: Start resumable upload — returns the upload URL
    server.middlewares.use('/api/gemini-upload', async (req, res, next) => {
      if (req.method !== 'POST') return next();

      const params = new URL(req.url || '', `http://${req.headers.host}`).searchParams;
      const apiKey = params.get('key');
      const contentLength = params.get('contentLength');
      const contentType = params.get('contentType');
      const displayName = params.get('displayName') || 'upload';

      if (!apiKey) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing API key' }));
        return;
      }

      try {
        const startRes = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'X-Goog-Upload-Protocol': 'resumable',
              'X-Goog-Upload-Command': 'start',
              'X-Goog-Upload-Header-Content-Length': contentLength || '0',
              'X-Goog-Upload-Header-Content-Type': contentType || 'application/octet-stream',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file: { displayName } }),
          }
        );

        if (!startRes.ok) {
          const errText = await startRes.text();
          res.statusCode = startRes.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(errText);
          return;
        }

        const uploadUrl = startRes.headers.get('x-goog-upload-url') || '';
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ uploadUrl }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    // Step 2: Upload raw bytes to the resumable URL
    server.middlewares.use('/api/gemini-upload-bytes', async (req, res, next) => {
      if (req.method !== 'POST') return next();

      const params = new URL(req.url || '', `http://${req.headers.host}`).searchParams;
      const uploadUrl = params.get('uploadUrl');

      if (!uploadUrl) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing uploadUrl' }));
        return;
      }

      try {
        // Collect the raw request body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk));
        }
        const body = Buffer.concat(chunks);

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Length': String(body.length),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize',
          },
          body: body,
        });

        const responseText = await uploadRes.text();
        res.statusCode = uploadRes.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(responseText);
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    // Step 3: Poll file processing status
    server.middlewares.use('/api/gemini-file-status', async (req, res, next) => {
      if (req.method !== 'GET') return next();

      const params = new URL(req.url || '', `http://${req.headers.host}`).searchParams;
      const apiKey = params.get('key');
      const fileName = params.get('name'); // e.g. "files/abc123"

      if (!apiKey || !fileName) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing key or name' }));
        return;
      }

      try {
        const statusRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
        );
        const responseText = await statusRes.text();
        res.statusCode = statusRes.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(responseText);
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  }
})

import http from 'node:http';
import https from 'node:https';

// ── Local LM Studio OCR Proxy (handles local OCR requests with infinite timeout & zero CORS) ──
const localOcrProxy = (): Plugin => ({
  name: 'local-ocr-proxy',
  configureServer(server) {
    server.middlewares.use('/api/local-ocr', async (req, res, next) => {
      if (req.method !== 'POST') return next();

      // Disable all socket timeouts so long-running local OCR inference (many minutes) never gets cut
      if (req.socket) req.socket.setTimeout(0);
      if (res.socket) res.socket.setTimeout(0);
      // @ts-ignore
      if (req.setTimeout) req.setTimeout(0);
      // @ts-ignore
      if (res.setTimeout) res.setTimeout(0);

      const params = new URL(req.url || '', `http://${req.headers.host}`).searchParams;
      const endpoint = params.get('endpoint') || 'http://169.254.83.107:1234';

      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk));
        }
        const bodyBuffer = Buffer.concat(chunks);

        const targetUrl = new URL(`${endpoint.replace(/\/+$/, '')}/v1/chat/completions`);
        const isHttps = targetUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const proxyReq = client.request(
          targetUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': bodyBuffer.length,
            },
            timeout: 0,
          },
          (proxyRes) => {
            res.statusCode = proxyRes.statusCode || 200;
            res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
            proxyRes.pipe(res);
          }
        );

        proxyReq.on('error', (err) => {
          console.error('[Local OCR Proxy Error]:', err.message);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: `LM Studio connection error: ${err.message}` }));
          }
        });

        proxyReq.write(bodyBuffer);
        proxyReq.end();
      } catch (err: any) {
        console.error('[Local OCR Middleware Error]:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Failed to connect to local LM Studio server.' }));
        }
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), youtubeTranscriptApi(), webScraperApi(), geminiFileUploadProxy(), localOcrProxy()],
})
