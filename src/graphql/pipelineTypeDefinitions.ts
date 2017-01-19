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
  region_x_min:Int
  region_x_max: Int
  region_y_min: Int
  region_y_max: Int
  region_z_min: Int
  region_z_max: Int
  is_processing: Boolean
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
  is_processing: Boolean
  project_id: String
  task_id: String
  previous_stage_id: String
  created_at: String
  updated_at: String
  deleted_at: String
  task: TaskDefinition
  performance: PipelineStagePerformance
}

type TileStageStatus {
    stage_id: String
    depth: Int
    status: Int
}

type TileStatus {
    x_index: Int
    y_index: Int
    stages: [TileStageStatus]
}

type TilePlane {
    max_depth: Int
    x_min: Int
    x_max: Int
    y_min: Int
    y_max: Int
    tiles: [TileStatus]
}

input RegionInput {
  x_min: Int
  x_max: Int
  y_min: Int
  y_max: Int
  z_min: Int
  z_max: Int
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
  projectPlaneTileStatus(project_id: String, plane: Int): TilePlane
}

type Mutation {
  createProject(name: String, description: String, rootPath: String, sampleNumber: Int, region: RegionInput): Project
  setProjectStatus(id: String, shouldBeActive: Boolean): Project
  deleteProject(id: String!): Boolean
  createPipelineStage(name: String, description: String, project_id: String, task_id: String, previous_stage_id: String, dst_path: String, function_type: Int): PipelineStage
  setPipelineStageStatus(id: String, shouldBeActive: Boolean): PipelineStage
  deletePipelineStage(id: String!): Boolean
}

schema {
  query: Query
  mutation: Mutation
}
`;

export default typeDefinitions;
