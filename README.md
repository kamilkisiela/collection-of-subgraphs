# Collection of Subgraphs

## Supergraph 1

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

In this example there is no simple key-based entity type resolution as you need to do a lot of entity calls, sometimes using entity of an entity (parent -> child).

Query planner is able to:

- understand deeply nested compound keys
- relation between entity types
- collect fields when traversing between subgraphs

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

## Supergraph 2

Much less complex relations and compound keys than in Supergraph 1, but still requires to do entity calls and use entity of an entity (parent -> child).

Subgraphs:

```
https://collection-of-subgraphs.vercel.app/api/2/products
https://collection-of-subgraphs.vercel.app/api/2/product-category
https://collection-of-subgraphs.vercel.app/api/2/category
```

Gateway:

```
https://collection-of-subgraphs.vercel.app/api/2/gateway
```

---

[Link to GraphiQL](https://collection-of-subgraphs.vercel.app/api/2/gateway?query=%7B%0A++products+%7B%0A++++id%0A++++pid%0A++++category+%7B%0A++++++id%0A++++++cid%0A++++++details+%7B%0A++++++++products%0A++++++%7D%0A++++++name%0A++++%7D%0A++%7D%0A%7D)

```graphql
{
  products {
    category {
      id
      details {
        products
      }
    }
  }
}
```

Expected result:

```json
{
  "data": {
    "products": [
      {
        "category": {
          "id": "c1",
          "details": {
            "products": 1
          }
        }
      },
      {
        "category": {
          "id": "c2",
          "details": {
            "products": 1
          }
        }
      }
    ]
  }
}
```

Query plan:

```graphql
QueryPlan {
  Sequence {
    Fetch(service: "products") {
      {
        products {
          __typename
          id
          pid
        }
      }
    },
    Flatten(path: "products.@") {
      Fetch(service: "product-category") {
        {
          ... on Product {
            __typename
            id
            pid
          }
        } =>
        {
          ... on Product {
            category {
              __typename
              id
              cid
            }
          }
        }
      },
    },
    Flatten(path: "products.@.category") {
      Fetch(service: "category") {
        {
          ... on Category {
            __typename
            id
            cid
          }
        } =>
        {
          ... on Category {
            details {
              products
            }
          }
        }
      },
    },
  },
}
```

## Supergraph 3

Super simple, has a single entity type, but with two different keys across two subgraphs.

Subgraphs:

```
https://collection-of-subgraphs.vercel.app/api/3/email
https://collection-of-subgraphs.vercel.app/api/2/nickname
```

Gateway:

```
https://collection-of-subgraphs.vercel.app/api/3/gateway
```

---

[Link to GraphiQL](https://collection-of-subgraphs.vercel.app/api/3/gateway?query=%7B%0A++user+%7B%0A++++nickname%0A++%7D%0A%7D)

```graphql
{
  user {
    nickname
  }
}
```

Expected result:

```json
{
  "data": {
    "user": {
      "nickname": "user1"
    }
  }
}
```

Query plan:

```graphql
QueryPlan {
  Sequence {
    Fetch(service: "email") {
      {
        user {
          __typename
          email
        }
      }
    },
    Flatten(path: "user") {
      Fetch(service: "nickname") {
        {
          ... on User {
            __typename
            email
          }
        } =>
        {
          ... on User {
            nickname
          }
        }
      },
    },
  },
}
```
