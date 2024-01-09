/// @ts-check
import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse } from "graphql";
import { createYoga } from "graphql-yoga";
import { ApolloGateway } from "@apollo/gateway";
import { composeServices } from "@apollo/composition";
import { useApolloFederation } from "@envelop/apollo-federation";

const users = [
  {
    id: "1",
    email: "user1@gmail.com",
    nickname: "user1",
  },
  {
    id: "2",
    email: "user2@gmail.com",
    nickname: "user2",
  },
];

const subgraphs = [
  {
    name: "email",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

      type Query {
        user: User
      }

      type User @key(fields: "id") {
        id: ID!
        email: String!
      }
    `),
    resolvers: {
      Query: {
        user() {
          return {
            id: users[0].id,
            email: users[0].email,
          };
        },
      },
      User: {
        __resolveReference(key) {
          const user = users.find((u) => u.id === key.id);

          if (!user) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
          };
        },
      },
    },
  },
  {
    name: "nickname",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(
          url: "https://specs.apollo.dev/federation/v2.0"
          import: ["@key", "@external"]
        )

      type User @key(fields: "email") {
        email: String! @external
        nickname: String!
      }
    `),
    resolvers: {
      User: {
        __resolveReference(key) {
          const user = users.find((u) => u.email === key.email);

          if (!user) {
            return null;
          }

          return {
            nickname: user.nickname,
          };
        },
      },
    },
  },
];

const baseUrl = process.env.VERCEL_URL
  ? "https://collection-of-subgraphs.vercel.app"
  : "http://localhost:3000";

const supergraph = composeServices(
  subgraphs.map((s) => ({
    name: s.name,
    typeDefs: s.typeDefs,
    url: `${baseUrl}/api/3/${s.name}`,
  }))
);

const gateway = new ApolloGateway({
  supergraphSdl: supergraph.supergraphSdl,
  __exposeQueryPlanExperimental: true,
  debug: true,
});

await gateway.load();

/**
 *
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.query.subgraph === "gateway") {
    const yoga = createYoga({
      plugins: [
        useApolloFederation({
          gateway,
        }),
      ],
      graphqlEndpoint: `/api/3/gateway`,
    });

    return yoga.handle(req, res);
  }

  const subgraph = subgraphs.find((s) => s.name === req.query.subgraph);

  if (!subgraph) {
    return res.status(404).end();
  }

  const schema = buildSubgraphSchema(subgraph);
  const yoga = createYoga({
    schema,
    graphqlEndpoint: `/api/3/${subgraph.name}`,
  });

  return yoga.handle(req, res);
}
