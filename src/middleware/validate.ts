import { NextFunction, Request, Response } from 'express';

type ZodSchemaLike = { parse: (input: unknown) => any };

export function validate(schema: ZodSchemaLike) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = schema.parse({ body: req.body, query: req.query, params: req.params });
      (req as any).body = data.body;
      (req as any).query = data.query;
      (req as any).params = data.params;
      next();
    } catch (e: any) {
      const issues = e.errors?.map((i: any) => ({ path: i.path?.join('.'), message: i.message }));
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: issues } });
    }
  };
}


