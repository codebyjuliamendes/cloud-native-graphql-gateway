import { GraphQLError } from 'graphql';
import { NotFoundError } from '../../src/domain/errors.js';
import { createFormatError } from '../../src/presentation/graphql/errors.js';

const resolverError = (original) => new GraphQLError(original.message, { originalError: original, path: ['users'] });

describe('formatError', () => {
  const format = createFormatError({ hideSuggestions: true });

  it('exposes typed application errors with their code', () => {
    const error = resolverError(new NotFoundError('User not found'));
    expect(format({ message: 'x', path: ['users'] }, error)).toEqual({
      message: 'User not found',
      path: ['users'],
      locations: undefined,
      extensions: { code: 'NOT_FOUND' },
    });
  });

  it('masks unexpected errors and drops stack traces', () => {
    const error = resolverError(new Error('SQLITE_ERROR at /srv/secret/path'));
    const formatted = format(
      { message: error.message, extensions: { code: 'INTERNAL_SERVER_ERROR', stacktrace: ['at x'] } },
      error,
    );
    expect(formatted).toEqual({
      message: 'Internal server error',
      locations: undefined,
      path: undefined,
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });

  it('keeps validation errors but hides schema suggestions when requested', () => {
    const error = new GraphQLError('Cannot query field "emial" on type "User". Did you mean "email"?', {
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
    });
    const formatted = format({ message: error.message, extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }, error);
    expect(formatted.message).toBe('Cannot query field "emial" on type "User".');
    const original = { message: error.message, extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } };
    expect(createFormatError({ hideSuggestions: false })(original, error).message).toMatch(/Did you mean "email"\?$/);
  });
});
