const http = require('http');
const { app } = require('./app');
const { initSocket } = require('./lib/socket');
const { startHourly } = require('./modules/sync/cron');

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  const base = `http://localhost:${PORT}`;
  const lines = [
    ' CSU Server is running ',
    ` Base URL   : ${base} `,
    ` Swagger    : ${base}/api-docs `,
  ];
  const width = Math.max(...lines.map(l => l.length)) + 2;
  const top = '┌' + '─'.repeat(width) + '┐';
  const bottom = '└' + '─'.repeat(width) + '┘';
  const body = lines.map(l => '│ ' + l.padEnd(width - 1, ' ') + '│').join('\n');
  console.log(`\n${top}\n${body}\n${bottom}\n`);
  startHourly();
});


