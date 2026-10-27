import { buildSchema, lexicographicSortSchema, printSchema } from 'graphql';
import { resolvers } from '../../src/presentation/graphql/resolvers.js';
import { typeDefs } from '../../src/presentation/graphql/typeDefs.js';

const schema = buildSchema(typeDefs);

describe('GraphQL schema', () => {
  it('matches the published contract (update the snapshot only for intended changes)', () => {
    expect(printSchema(lexicographicSortSchema(schema))).toMatchSnapshot();
  });

  it('only defines resolvers for fields that exist in the schema', () => {
    for (const [typeName, fields] of Object.entries(resolvers)) {
      const type = schema.getType(typeName);
      expect(type).toBeDefined();
      for (const field of Object.keys(fields)) {
        expect(`${typeName}.${field}: ${Boolean(type.getFields()[field])}`).toBe(`${typeName}.${field}: true`);
      }
    }
  });

  it('resolves every root field explicitly', () => {
    for (const root of ['Query', 'Mutation']) {
      expect(Object.keys(resolvers[root]).sort()).toEqual(Object.keys(schema.getType(root).getFields()).sort());
    }
  });
});
