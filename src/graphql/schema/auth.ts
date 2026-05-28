export const authTypeDefs = `#graphql
  type User {
    id: ID!
    username: String!
  }

  type LoginResponse implements MutationResponse {
    code: Int!
    success: Boolean!
    message: String
    accessToken: String
  }

  extend type Query {
    me: User!
  }

  extend type Mutation {
    login(username: String!): LoginResponse!
  }
`;
