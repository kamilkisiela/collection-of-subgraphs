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
    tag: "t1",
    mainProduct: "1",
  },
  {
    id: "c2",
    tag: "t2",
    mainProduct: "2",
  },
];

const subgraphs = [
  {
    name: "products",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(
          url: "https://specs.apollo.dev/federation/v2.0"
          import: ["@key", "@external", "@extends", "@shareable"]
        )

      type Query {
        topProducts: ProductList!
      }

      type ProductList @key(fields: "products{id}") {
        products: [Product!]!
      }

      type Product @extends @key(fields: "id") {
        id: String! @external
        category: Category @shareable
      }

      type Category @key(fields: "id") {
        mainProduct: Product! @shareable
        id: String!
        tag: String @shareable
      }
    `),
    resolvers: {
      Query: {
        topProducts() {
          return {
            products,
          };
        },
      },
      ProductList: {
        __resolveReference(key) {
          return {
            products: products.filter((p) =>
              key.products.some((k) => k.id === p.id)
            ),
          };
        },
      },
      Product: {
        __resolveReference(key) {
          return products.find((product) => product.id === key.id);
        },
        category(product) {
          return categories.find((c) => c.id === product.categoryId);
        },
      },
      Category: {
        __resolveReference(key) {
          return categories.find((c) => c.id === key.id);
        },
        mainProduct(category) {
          return products.find((p) => p.id === category.mainProduct);
        },
      },
    },
  },
  {
    name: "core",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

      type Product @key(fields: "id") @key(fields: "id pid") {
        id: String!
        pid: String!
      }
    `),
    resolvers: {
      Product: {
        __resolveReference(key) {
          if ("pid" in key) {
            return products.find(
              (product) => product.id === key.id && product.pid === key.pid
            );
          }

          return products.find((product) => product.id === key.id);
        },
      },
    },
  },
  {
    name: "product-list",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(
          url: "https://specs.apollo.dev/federation/v2.0"
          import: ["@key", "@shareable"]
        )

      type ProductList @key(fields: "products{id pid}") {
        products: [Product!]!
        first: Product @shareable
        selected: Product @shareable
      }

      type Product @key(fields: "id pid") {
        id: String!
        pid: String
      }
    `),
    resolvers: {
      ProductList: {
        __resolveReference(key) {
          const prods = products.filter((p) =>
            key.products.some((k) => k.id === p.id && k.pid === p.pid)
          );
          return {
            products: prods,
            first: prods[0],
            selected: prods[1],
          };
        },
      },
      Product: {
        __resolveReference(key) {
          return products.find(
            (product) => product.id === key.id && product.pid === key.pid
          );
        },
      },
    },
  },
  {
    name: "product-price",
    typeDefs: parse(/* GraphQL */ `
      extend schema
        @link(
          url: "https://specs.apollo.dev/federation/v2.0"
          import: ["@key", "@shareable"]
        )

      type ProductList
        @key(fields: "products{id pid category{id tag}} selected{id}") {
        products: [Product!]!
        first: Product @shareable
        selected: Product @shareable
      }

      type Product @key(fields: "id pid category{id tag}") {
        id: String!
        price: Price
        pid: String
        category: Category
      }

      type Category @key(fields: "id tag") {
        id: String!
        tag: String
      }

      type Price {
        price: Float!
      }
    `),
    resolvers: {
      Product: {
        __resolveReference(key) {
          return products.find((p) => {
            if (p.id === key.id && p.pid === key.pid) {
              const cat = categories.find((c) => c.id === p.categoryId);

              if (
                cat &&
                cat.id === key.category.id &&
                cat.tag === key.category.tag
              ) {
                return true;
              }
            }

            return false;
          });
        },
        price(product) {
          return {
            price: product.price,
          };
        },
        category(product) {
          return categories.find((c) => c.id === product.categoryId);
        },
      },
      Category: {
        __resolveReference(key) {
          return categories.find((c) => c.id === key.id);
        },
      },
      ProductList: {
        __resolveReference(key) {
          const prods = products.filter((p) =>
            key.products.some((k) => {
              if (p.id === k.id && p.pid === k.pid) {
                const cat = categories.find((c) => c.id === p.categoryId);

                if (
                  cat &&
                  cat.id === k.category.id &&
                  cat.tag === k.category.tag
                ) {
                  return true;
                }
              }

              return false;
            })
          );

          return {
            products: prods,
            first: prods[0],
            selected: products.find((p) => p.id === key.selected.id),
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
    url: `${baseUrl}/api/1/${s.name}`,
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
      graphqlEndpoint: `/api/1/gateway`,
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
    graphqlEndpoint: `/api/1/${subgraph.name}`,
  });

  return yoga.handle(req, res);
}
