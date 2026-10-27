import { unwrapResolverError } from '@apollo/server/errors';
import { GraphQLError } from 'graphql';
import { AppError } from '../../domain/errors.js';

const SUGGESTION = /\s*Did you mean .*\?$/;

/** True for errors whose message is safe to show to clients. */
export function isClientSafe(error) {
  const original = unwrapResolverError(error);
  if (original instanceof AppError) return true;
  if (!(original instanceof GraphQLError)) return false;
  if (original.extensions?.code === 'INTERNAL_SERVER_ERROR') return false;
  // A GraphQLError wrapping an arbitrary error (e.g. thrown in context) is internal.
  return !original.originalError || original.originalError instanceof GraphQLError;
}

/**
 * Apollo formatError: exposes typed application errors and GraphQL
 * validation errors, masks everything else, and never includes stack traces.
 * @param {{ hideSuggestions: boolean }} options
 */
export function createFormatError({ hideSuggestions }) {
  return (formattedError, error) => {
    const { locations, path } = formattedError;
    const original = unwrapResolverError(error);

    if (original instanceof AppError) {
      return {
        message: original.message,
        locations,
        path,
        extensions: {
          code: original.code,
          ...(original.details !== undefined && { details: original.details }),
        },
      };
    }

    if (isClientSafe(error)) {
      const { stacktrace, http, ...extensions } = formattedError.extensions ?? {}; // eslint-disable-line no-unused-vars
      const message = hideSuggestions ? formattedError.message.replace(SUGGESTION, '') : formattedError.message;
      return { message, locations, path, extensions };
    }

    return { message: 'Internal server error', locations, path, extensions: { code: 'INTERNAL_SERVER_ERROR' } };
  };
}
