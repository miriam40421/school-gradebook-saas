import http from 'http';
import net from 'net';

const PORT = 3000;
const TARGET_PORT = 3002;

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${TARGET_PORT}` },
  };
  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxy.on('error', (e) => {
    res.writeHead(502);
    res.end(`Proxy error: ${e.message}`);
  });
  req.pipe(proxy, { end: true });
});

// Handle WebSocket upgrades (needed for Next.js HMR)
server.on('upgrade', (req, clientSocket, head) => {
  const targetSocket = net.connect(TARGET_PORT, '127.0.0.1', () => {
    const headers = [
      `${req.method} ${req.url} HTTP/1.1`,
      `Host: localhost:${TARGET_PORT}`,
      ...Object.entries(req.headers)
        .filter(([k]) => k !== 'host')
        .map(([k, v]) => `${k}: ${v}`),
      '',
      '',
    ].join('\r\n');
    targetSocket.write(headers);
    if (head && head.length) targetSocket.write(head);
    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);
  });
  targetSocket.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => targetSocket.destroy());
});

// Listen on all interfaces including IPv6 (Chromium prefers ::1 over 127.0.0.1)
server.listen(PORT, '::', () => {
  console.log(`Proxy running: http://[::]:${PORT} → localhost:${TARGET_PORT} (IPv4+IPv6 + WebSocket)`);
});
