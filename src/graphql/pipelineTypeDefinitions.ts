let typeDefinitions = `    
interface ITimestamps {
  created_at: String
  updated_at: String
  deleted_at: String
}

type TaskDefinition implements ITimestamps {
  id: String!
  name: String!
  description: String!
  script: String!
  interpreter: String!
  created_at: String
  updated_at: String
  deleted_at: String
}

type Query {
  taskDefinitions: [TaskDefinition!]!
  taskDefinition(id: String!): TaskDefinition
}

type Mutation {
  debugMessage(msg: String!): String!
}

schema {
  query: Query
  mutation: Mutation
}
`;

export default typeDefinitions;
