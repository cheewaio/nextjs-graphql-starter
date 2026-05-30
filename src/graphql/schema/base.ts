export const baseTypeDefs = `#graphql
  scalar DateTime

  type Query
  type Mutation

  enum SortOrder {
    ASC
    DESC
  }

  input SortField {
    field: String!
    order: SortOrder! = ASC
  }

  enum PaginationMode {
    CURSOR
    OFFSET
  }

  input SearchInput {
    query: String!
    fields: [String!]
  }

  input PaginationInput {
    mode: PaginationMode = CURSOR
    pageSize: Int = 20
    pageNumber: Int
    cursor: String
    search: SearchInput
    sort: [SortField!]
    filter: FilterInput
  }

  interface PaginationPage {
    pageSize: Int!
  }

  type OffsetPage implements PaginationPage {
    pageSize: Int!
    pageNumber: Int!
  }

  type CursorPage implements PaginationPage {
    pageSize: Int!
    cursor: String!
  }

  type PaginationMetadata {
    next: PaginationPage
    previous: PaginationPage
    total: Int!
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
