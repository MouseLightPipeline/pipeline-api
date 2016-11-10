let typeDefinitions = `    
interface ITableModel {
  id: String!
  created_at: String
  updated_at: String
  deleted_at: String
}

type Worker implements ITableModel {
  id: String!
  name: String
  description: String
  machine_id: String
  last_seen: String
  created_at: String
  updated_at: String
  deleted_at: String
}

type Project implements ITableModel {
  id: String!
  name: String
  description: String
  root_path: String
  sample_number: Int
  created_at: String
  updated_at: String
  deleted_at: String
}

type PipelineStage implements ITableModel {
  id: String!
  name: String
  description: String
  function_type: Int
  execution_order: Int
  src_path: String
  dst_path: String
  created_at: String
  updated_at: String
  deleted_at: String
}

type TaskDefinition implements ITableModel {
  id: String!
  name: String!
  description: String!
  script: String!
  interpreter: String!
  created_at: String
  updated_at: String
  deleted_at: String
}

type TaskStatistic implements ITableModel {
  id: String!
  num_execute: Int
  num_complete: Int
  num_error: Int
  num_cancelled: Int
  duration_avg: Float
  duration_long: Float
  created_at: String
  updated_at: String
  deleted_at: String
}

type Query {
  worker(id: String!): Worker
  workers: [Worker!]!
  project(id: String!): Project
  projects: [Project!]!
  pipelineStage(id: String!): PipelineStage
  pipelineStages: [PipelineStage!]!
  taskDefinition(id: String!): TaskDefinition
  taskDefinitions: [TaskDefinition!]!
  taskStatistic(id: String!): TaskStatistic
  taskStatistics: [TaskStatistic!]!
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
