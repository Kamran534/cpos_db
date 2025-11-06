const cors = require('cors');

function buildCors() {
  const raw = process.env.CORS_ALLOWED_ORIGINS || '';
  const allowAll = raw.trim() === '*';
  const allowedOrigins = allowAll ? [] : raw.split(',').map(s => s.trim()).filter(Boolean);

  const options = {
    origin: allowAll ? true : function (origin, callback) {
      if (!origin) return callback(null, false);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS: Origin not allowed'));
    },
    credentials: true,
    methods: ['GET','HEAD','OPTIONS','PUT','PATCH','POST','DELETE'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
    maxAge: 86400,
  };

  return cors(options);
}

module.exports = { buildCors };


