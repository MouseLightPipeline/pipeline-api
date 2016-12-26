let typeDefinitions = `    
interface ITableModel {
  id: String!
  created_at: String
  updated_at: String
  deleted_at: String
}

type PipelineWorker implements ITableModel {
  id: String!
  machine_id: String
  name: String
  os_type: String
  platform: String
  arch: String
  release: String
  cpu_count: Int
  total_memory: Float
  free_memory: Float
  load_average: Float
  work_unit_capacity: Float
  last_seen: String
  task_load: Float
  status: Int
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
  args: String!
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

type PipelineStagePerformance implements ITableModel {
  id: String!
  pipeline_stage_id: String
  num_in_process: Int
  num_ready_to_process: Int
  num_execute: Int
  num_complete: Int
  num_error: Int
  num_cancel: Int
  cpu_average: Float
  cpu_high: Float
  cpu_low: Float
  memory_average: Float
  memory_high: Float
  memory_low: Float
  duration_average: Float
  duration_high: Float
  duration_low: Float
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
  dst_path: String
  is_active: Boolean
  project_id: String
  task_id: String
  previous_stage_id: String
  created_at: String
  updated_at: String
  deleted_at: String
  task: TaskDefinition
  performance: PipelineStagePerformance
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
  pipelineStagePerformance(id: String!): PipelineStagePerformance
  pipelineStagePerformances: [PipelineStagePerformance!]!
}

type Mutation {
  createProject(name: String, description: String, rootPath: String, sampleNumber: Int): Project
  setProjectStatus(id: String, shouldBeActive: Boolean): Project
  deleteProject(id: String!): Boolean
  createPipelineStage(project_id: String, task_id: String, previous_stage_id: String, dst_path: String): PipelineStage
  setPipelineStageStatus(id: String, shouldBeActive: Boolean): PipelineStage
  deletePipelineStage(id: String!): Boolean
}

schema {
  query: Query
  mutation: Mutation
}
`;

export default typeDefinitions;
