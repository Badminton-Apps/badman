declare module '*.gql' {
  import { DocumentNode } from 'graphql';
  const schema: DocumentNode;

  export = schema;
}
