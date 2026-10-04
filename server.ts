import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import geminiRouter from './src/api/gemini.ts';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createHttpServer } from 'http';
import { SimulationEngine } from './src/lib/SimulationEngine.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.use('/api/gemini', geminiRouter);

  // Vite integration
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.use(vite.middlewares);

  const httpServer = createHttpServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  const engine = new SimulationEngine((data) => {
    // Broadcast updates to all clients
    const payload = JSON.stringify(data);
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  });

  engine.start();

  wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');
    
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'BOT_COMMAND') {
          if (data.command === 'PAUSE' || data.command === 'RESUME') {
            engine.toggleBot(data.botId);
          }
          if (data.action === 'EMERGENCY_KILL_SWITCH_ACTIVE') {
            engine.triggerKillSwitch();
          }
        }
      } catch (e) {
        console.error('WS Message Error:', e);
      }
    });

    ws.on('close', () => console.log('Client disconnected'));
  });

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const templatePath = path.resolve(__dirname, 'index.html');
      let template = fs.readFileSync(templatePath, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  httpServer.listen(3000, '0.0.0.0', () => {
    console.log('Full-stack server running on http://0.0.0.0:3000');
  });
}

startServer();
