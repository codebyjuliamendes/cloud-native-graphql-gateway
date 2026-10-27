import { GraphQLError, Kind, getNullableType, isListType } from 'graphql';
import { getComplexity, simpleEstimator } from 'graphql-query-complexity';

/** Assumed size for list fields without a `limit` argument. */
export const DEFAULT_LIST_SIZE = 10;

function measureDepth(selectionSet, depth, fragments, visited) {
  let max = depth;
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      // Meta fields (__typename, __schema, __type) are governed by the
      // introspection switch, not by the depth limit.
      if (selection.name.value.startsWith('__')) continue;
      const fieldDepth = selection.selectionSet
        ? measureDepth(selection.selectionSet, depth + 1, fragments, visited)
        : depth + 1;
      max = Math.max(max, fieldDepth);
    } else if (selection.kind === Kind.INLINE_FRAGMENT) {
      max = Math.max(max, measureDepth(selection.selectionSet, depth, fragments, visited));
    } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
      const name = selection.name.value;
      const fragment = fragments.get(name);
      // Unknown or cyclic fragments are reported by the standard rules.
      if (!fragment || visited.has(name)) continue;
      max = Math.max(max, measureDepth(fragment.selectionSet, depth, fragments, new Set([...visited, name])));
    }
  }
  return max;
}

/** Validation rule rejecting operations nested deeper than `maxDepth`. */
export function depthLimitRule(maxDepth) {
  return (context) => {
    const fragments = new Map(
      context
        .getDocument()
        .definitions.filter((definition) => definition.kind === Kind.FRAGMENT_DEFINITION)
        .map((definition) => [definition.name.value, definition]),
    );
    return {
      OperationDefinition(node) {
        const depth = measureDepth(node.selectionSet, 0, fragments, new Set());
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(`Query depth ${depth} exceeds the maximum allowed depth of ${maxDepth}`, {
              nodes: [node],
              extensions: { code: 'QUERY_TOO_DEEP' },
            }),
          );
        }
      },
    };
  };
}

/**
 * Cost estimator: list fields multiply the cost of their children by the
 * requested `limit` (or DEFAULT_LIST_SIZE when there is no limit argument).
 */
export function listEstimator({ field, args, childComplexity }) {
  if (!isListType(getNullableType(field.type))) return undefined;
  const size = Number.isInteger(args?.limit) && args.limit > 0 ? args.limit : DEFAULT_LIST_SIZE;
  return 1 + size * Math.max(childComplexity, 1);
}

/** Apollo plugin rejecting operations whose estimated cost exceeds `maxComplexity`. */
export function complexityLimitPlugin(maxComplexity) {
  return {
    async requestDidStart() {
      return {
        async didResolveOperation({ request, document, schema }) {
          const complexity = getComplexity({
            schema,
            query: document,
            operationName: request.operationName,
            variables: request.variables,
            estimators: [listEstimator, simpleEstimator({ defaultComplexity: 1 })],
          });
          if (complexity > maxComplexity) {
            throw new GraphQLError(
              `Query complexity ${complexity} exceeds the maximum allowed complexity of ${maxComplexity}`,
              { extensions: { code: 'QUERY_TOO_COMPLEX', http: { status: 400 } } },
            );
          }
        },
      };
    },
  };
}
