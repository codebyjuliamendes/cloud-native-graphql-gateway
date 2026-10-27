import { buildSchema, parse, specifiedRules, validate } from 'graphql';
import { depthLimitRule } from '../../src/presentation/graphql/limits.js';
import { typeDefs } from '../../src/presentation/graphql/typeDefs.js';

const schema = buildSchema(typeDefs.replace('#graphql', ''));
const errorsFor = (query, maxDepth = 3) =>
  validate(schema, parse(query), [...specifiedRules, depthLimitRule(maxDepth)]).map((e) => e.message);

describe('depthLimitRule', () => {
  it('accepts operations within the limit', () => {
    expect(errorsFor('{ orders { user { name } } }')).toEqual([]);
  });

  it('rejects operations deeper than the limit', () => {
    expect(errorsFor('{ orders { user { orders { id } } } }')).toEqual([
      'Query depth 4 exceeds the maximum allowed depth of 3',
    ]);
  });

  it('follows fragments and inline fragments', () => {
    const query = `
      query { orders { ...O } }
      fragment O on Order { user { ... on User { orders { id } } } }
    `;
    expect(errorsFor(query)).toEqual(['Query depth 4 exceeds the maximum allowed depth of 3']);
  });

  it('ignores meta fields such as __typename', () => {
    expect(errorsFor('{ orders { user { __typename name } } }')).toEqual([]);
  });
});
