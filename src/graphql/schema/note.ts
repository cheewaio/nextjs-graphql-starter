export const noteTypeDefs = `#graphql
  type Note {
    id: ID!
    title: String!
    content: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateNoteInput {
    title: String!
    content: String!
  }

  input UpdateNoteInput {
    title: String
    content: String
  }

  type NoteConnection {
    items: [Note!]!
    pageInfo: PageInfo!
  }

  type NoteResponse implements MutationResponse {
    code: Int!
    success: Boolean!
    message: String
    note: Note
  }

  type DeleteResponse implements MutationResponse {
    code: Int!
    success: Boolean!
    message: String
  }

  extend type Query {
    note(id: ID!): Note
    notes(input: PageInput, filter: FilterInput): NoteConnection!
  }

  extend type Mutation {
    createNote(input: CreateNoteInput!): NoteResponse!
    updateNote(id: ID!, input: UpdateNoteInput!): NoteResponse!
    deleteNote(id: ID!): DeleteResponse!
  }
`;
