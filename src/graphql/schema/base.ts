export const baseTypeDefs = `#graphql
  scalar DateTime

  type Query
  type Mutation

  input SortField {
    field: String!
    asc: Boolean!
  }

  input PageInput {
    first: Int
    after: String
    last: Int
    before: String
    sort: [SortField!]
  }

  type PageInfo {
    startCursor: String
    endCursor: String
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  enum FilterOperator {
    EQ
    NEQ
    CONTAINS
    GT
    GTE
    LT
    LTE
    IS_NULL
    IS_NOT_NULL
  }

  enum FilterLogic {
    AND
    OR
  }

  input FilterCriteria {
    field: String!
    operator: FilterOperator!
    value: String
  }

  input FilterInput {
    filters: [FilterCriteria!]
    logic: FilterLogic! = AND
  }

  interface MutationResponse {
    code: Int!
    success: Boolean!
    message: String
  }
`;
