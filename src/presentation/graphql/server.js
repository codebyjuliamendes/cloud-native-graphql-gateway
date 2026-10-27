import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { createFormatError, isClientSafe } from './errors.js';
import { complexityLimitPlugin, depthLimitRule } from './limits.js';
import { resolvers } from './resolvers.js';
import { typeDefs } from './typeDefs.js';

/** Logs unexpected errors (with the request id) and counts operations. */
function observabilityPlugin(metrics) {
  return {
    async requestDidStart() {
      return {
        async didEncounterErrors({ errors, contextValue, operation }) {
          for (const error of errors) {
            if (isClientSafe(error)) continue;
            contextValue?.logger?.error(
              { err: error.originalError ?? error, path: error.path, requestId: contextValue?.requestId },
              'GraphQL operation failed',
            );
          }
          metrics?.recordOperation(operation?.operation ?? 'unknown', 'error');
        },
        async willSendResponse({ operation, errors }) {
          if (!errors?.length) metrics?.recordOperation(operation?.operation ?? 'unknown', 'success');
        },
      };
    },
  };
}

/**
 * @param {{
 *   config: ReturnType<typeof import('../../config/env.js').loadConfig>,
 *   metrics?: ReturnType<typeof import('../../config/metrics.js').createMetrics>,
 *   plugins?: import('@apollo/server').ApolloServerPlugin[],
 * }} options
 */
export function createApolloServer({ config, metrics, plugins = [] }) {
  const { introspection, landingPage, maxDepth, maxComplexity } = config.graphql;
  return new ApolloServer({
    typeDefs,
    resolvers,
    introspection,
    includeStacktraceInErrorResponses: false,
    formatError: createFormatError({ hideSuggestions: !introspection }),
    validationRules: [depthLimitRule(maxDepth)],
    plugins: [
      landingPage
        ? ApolloServerPluginLandingPageLocalDefault({ embed: true, includeCookies: false })
        : ApolloServerPluginLandingPageDisabled(),
      complexityLimitPlugin(maxComplexity),
      observabilityPlugin(metrics),
      ...plugins,
    ],
  });
}
