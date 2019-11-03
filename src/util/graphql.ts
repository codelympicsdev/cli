import { GraphQLClient } from 'graphql-request';

const base = process.env.BASE_URL
  ? process.env.BASE_URL
  : 'https://api.codelympics.dev/v0/graphql';

export const client = (token: string) =>
  new GraphQLClient(base, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
