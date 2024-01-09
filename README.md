# Collection of Subgraphs

## Number 1

Complex relations and compound keys.

Subgraphs:

```
https://collection-of-subgraphs.vercel.app/api/1/products
https://collection-of-subgraphs.vercel.app/api/1/core
https://collection-of-subgraphs.vercel.app/api/1/product-price
https://collection-of-subgraphs.vercel.app/api/1/product-list
```

Gateway:

```
https://collection-of-subgraphs.vercel.app/api/1/gateway
```

---

[Link to GraphiQL](https://collection-of-subgraphs.vercel.app/api/1/gateway?query=%7B%0A++topProducts+%7B%0A++++products+%7B%0A++++++id%0A++++++pid%0A++++++price+%7B%0A++++++++price%0A++++++%7D%0A++++++category+%7B%0A++++++++mainProduct+%7B%0A++++++++++id%0A++++++++%7D%0A++++++++id%0A++++++++tag%0A++++++%7D%0A++++%7D%0A++++selected+%7B%0A++++++id%0A++++%7D%0A++++first+%7B%0A++++++id%0A++++%7D%0A++%7D%0A%7D)

```graphql
{
  topProducts {
    products {
      id
      pid
      price {
        price
      }
      category {
        mainProduct {
          id
        }
        id
        tag
      }
    }
    selected {
      id
    }
    first {
      id
    }
  }
}
```

Expected result:

```json
{
  "data": {
    "topProducts": {
      "products": [
        {
          "id": "1",
          "pid": "p1",
          "price": {
            "price": 100
          },
          "category": {
            "mainProduct": {
              "id": "1"
            },
            "id": "c1",
            "tag": "t1"
          }
        },
        {
          "id": "2",
          "pid": "p2",
          "price": {
            "price": 200
          },
          "category": {
            "mainProduct": {
              "id": "2"
            },
            "id": "c2",
            "tag": "t2"
          }
        }
      ],
      "selected": {
        "id": "2"
      },
      "first": {
        "id": "1"
      }
    }
  }
}
```

Query plan:

```graphql
QueryPlan {
  Sequence {
    Fetch(service: "products") {
      {
        topProducts {
          __typename
          products {
            __typename
            id
            category {
              mainProduct {
                id
              }
              id
              tag
            }
          }
        }
      }
    },
    Flatten(path: "topProducts.products.@") {
      Fetch(service: "core") {
        {
          ... on Product {
            __typename
            id
          }
        } =>
        {
          ... on Product {
            pid
          }
        }
      },
    },
    Parallel {
      Flatten(path: "topProducts.products.@") {
        Fetch(service: "product-price") {
          {
            ... on Product {
              __typename
              id
              pid
              category {
                id
                tag
              }
            }
          } =>
          {
            ... on Product {
              price {
                price
              }
            }
          }
        },
      },
      Flatten(path: "topProducts") {
        Fetch(service: "product-list") {
          {
            ... on ProductList {
              __typename
              products {
                id
                pid
              }
            }
          } =>
          {
            ... on ProductList {
              selected {
                id
              }
              first {
                id
              }
            }
          }
        },
      },
    },
  },
}
```
