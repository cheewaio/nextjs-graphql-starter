import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "http://localhost:3000/graphql",
  documents: "src/**/*.graphql",
  generates: {
    "src/generated/graphql.ts": {
      plugins: [
        "typescript-operations",
        "typed-document-node",
      ],
    },
  },
};

export default config;
