let typeDefinitions = `    
interface ITableModel {
  id: String!
  created_at: String
  updated_at: String
  deleted_at: String
}

type PipelineWorker implements ITableModel {
  id: String!
  name: String
  description: String
  machine_id: String
  last_seen: String
  status: Int
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
  is_active: Boolean
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
  is_active: Boolean
  project_id: String
  task_id: String
  previous_stage_id: String
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
  pipelineWorker(id: String!): PipelineWorker
  pipelineWorkers: [PipelineWorker!]!
  project(id: String!): Project
  projects(includeDeleted: Boolean = false): [Project!]!
  pipelineStage(id: String!): PipelineStage
  pipelineStages: [PipelineStage!]!
  pipelineStagesForProject(id: String!): [PipelineStage!]!
  taskDefinition(id: String!): TaskDefinition
  taskDefinitions: [TaskDefinition!]!
  taskStatistic(id: String!): TaskStatistic
  taskStatistics: [TaskStatistic!]!
}

type Mutation {
  debugMessage(msg: String!): String!
  createProject(name: String, description: String, rootPath: String, sampleNumber: Int): Project
  setProjectStatus(id: String, shouldBeActive: Boolean): Project
  deleteProject(id: String!): Boolean
  createPipelineStage(project_id: String, task_id: String, previous_stage_id: String, src_path: String, dst_path: String): PipelineStage
  setPipelineStageStatus(id: String, shouldBeActive: Boolean): PipelineStage
  deletePipelineStage(id: String!): Boolean
}

schema {
  query: Query
  mutation: Mutation
}
`;

export default typeDefinitions;
