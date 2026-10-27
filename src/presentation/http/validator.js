import { ValidationError } from '../../domain/errors.js';

/**
 * Validates (and normalizes) a request part with a Joi schema.
 * @param {import('joi').Schema} schema
 * @param {'body' | 'query'} [source]
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: false });
    if (error) {
      return next(
        new ValidationError(
          'Validation failed',
          error.details.map((detail) => detail.message),
        ),
      );
    }
    // Express 5 exposes req.query as a getter, so keep the parsed value apart.
    req.validated = { ...req.validated, [source]: value };
    return next();
  };
};
