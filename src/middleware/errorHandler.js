function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Unexpected error';
  const context = err.context;
  res.status(status).json({ error: { code, message, context } });
}

module.exports = { notFoundHandler, errorHandler };


