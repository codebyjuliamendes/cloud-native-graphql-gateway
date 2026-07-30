export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.details = error.details.map((x) => x.message);
      return next(err);
    }
    next();
  };
};
