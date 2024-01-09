/// @ts-check
import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse } from "graphql";
import { createYoga } from "graphql-yoga";
import { ApolloGateway } from "@apollo/gateway";
import { composeServices } from "@apollo/composition";
import { useApolloFederation } from "@envelop/apollo-federation";

const products = [
  {
    id: "1",
    pid: "p1",
    categoryId: "c1",
    price: 100,
  },
  {
    id: "2",
    pid: "p2",
    categoryId: "c2",
    price: 200,
  },
];

const categories = [
  {
    id: "c1",
    cid: "cid1",
    name: "Category 1",
  },
  {
    id: "c2",
    cid: "cid2",
    name: "Category 2",
  },
];

const subgraphs = [
  {
    name: "products",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(
          url: "https://specs.apollo.dev/federation/v2.0"
          import: ["@key", "@external"]
        )

      type Query {
        products: [Product!]!
      }

      type Product @key(fields: "id") @key(fields: "id pid") {
        id: ID!
        pid: ID
      }

      type Category @key(fields: "id name") {
        id: ID!
        name: String! @external
      }
    `),
    resolvers: {
      Query: {
        products() {
          return products;
        },
      },
      Product: {
        __resolveReference(key) {
          if ("pid" in key) {
            return products.find((p) => p.id === key.id && p.pid === key.pid);
          }

          return products.find((p) => p.id === key.id);
        },
      },
      Category: {
        __resolveReference(key) {
          return categories.find((c) => c.id === key.id && c.name === key.name);
        },
      },
    },
  },
  {
    name: "product-category",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

      type Product @key(fields: "id pid") {
        id: ID!
        pid: ID
        category: Category
      }

      type Category @key(fields: "id name") @key(fields: "cid") {
        id: ID!
        cid: ID!
        name: String!
      }
    `),
    resolvers: {
      Product: {
        __resolveReference(key) {
          return products.find((p) => p.id === key.id && p.pid === key.pid);
        },
        category(product) {
          return categories.find((c) => c.id === product.categoryId);
        },
      },
      Category: {
        __resolveReference(key) {
          if ("cid" in key) {
            return categories.find((c) => c.cid === key.cid);
          }
          return categories.find((c) => c.id === key.id && c.name === key.name);
        },
      },
    },
  },
  {
    name: "category",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

      type Category @key(fields: "id cid") {
        id: ID!
        cid: ID
        details: CategoryDetails
      }

      type CategoryDetails {
        products: Int
      }
    `),
    resolvers: {
      Category: {
        __resolveReference(key) {
          return categories.find((c) => c.id === key.id && c.cid === key.cid);
        },
        details(category) {
          return {
            products: products.filter((p) => p.categoryId === category.id)
              .length,
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
    url: `${baseUrl}/api/2/${s.name}`,
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
      graphqlEndpoint: `/api/2/gateway`,
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
    graphqlEndpoint: `/api/2/${subgraph.name}`,
  });

  return yoga.handle(req, res);
}
