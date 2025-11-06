function validate(schema) {
  return (req, res, next) => {
    try {
      const data = schema.parse({ body: req.body, query: req.query, params: req.params });
      req.body = data.body;
      req.query = data.query;
      req.params = data.params;
      next();
    } catch (e) {
      const issues = e.errors?.map((i) => ({ path: i.path?.join('.'), message: i.message }));
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: issues } });
    }
  };
}

module.exports = { validate };


