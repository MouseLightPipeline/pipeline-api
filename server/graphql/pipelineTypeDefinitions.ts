export const typeDefinitions = `
scalar Date

type SchedulerHealth {
    lastResponse: Int
    lastSeen: Date
}

type PageInfo {
    endCursor: String
    hasNextPage: Boolean
}

type ExecutionEdge {
    node: TaskExecution
    cursor: String
}

type ExecutionConnection {
    totalCount: Int
    pageInfo: PageInfo
    edges: [ExecutionEdge]
}

type ExecutionPage {
    offset: Int
    limit: Int
    totalCount: Int
    hasNextPage: Boolean
    items: [TaskExecution]
}

type PipelineWorker {
  id: String!
  worker_id: String
  name: String
  os_type: String
  platform: String
  arch: String
  release: String
  cpu_count: Int
  total_memory: Float
  free_memory: Float
  load_average: Float
  local_work_capacity: Float
  cluster_work_capacity: Float
  last_seen: Date
  local_task_load: Float
  cluster_task_load: Float
  status: Int
  is_in_scheduler_pool: Boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date
}

type TaskRepository {
  id: String!
  name: String!
  description: String!
  location: String!
  task_definitions: [TaskDefinition!]!
  created_at: Date
  updated_at: Date
  deleted_at: Date
}

type TaskDefinition {
  id: String!
  name: String!
  description: String!
  script: String!
  interpreter: String!
  script_args: String!
  cluster_args: String
  expected_exit_code: Int
  local_work_units: Float
  cluster_work_units: Float
  log_prefix: String
  task_repository_id: String
  task_repository: TaskRepository
  pipeline_stages: [PipelineStage!]!
  script_status: Boolean
  created_at: Date
  updated_at: Date
  deleted_at: Date
}

type TaskExecution {
  id: String
  worker_id: String
  task_definition_id: String
  task_definition: TaskDefinition
  pipeline_stage_id: String
  pipeline_stage: PipelineStage
  work_units: Float
  cluster_work_units: Float
  resolved_output_path: String
  resolved_script: String
  resolved_interpreter: String
  resolved_script_args: String
  resolved_cluster_args: String
  resolved_log_path: String
  queue_type: Int
  job_id: Int
  job_name: String
  execution_status_code: Int
  completion_status_code: Int
  last_process_status_code: Float
  cpu_time_seconds: Float
  max_memory_mb: Float
  max_cpu_percent: Float
  exit_code: Int
  submitted_at: Date
  started_at: Date
  completed_at: Date
  created_at: Date
  updated_at: Date
  deleted_at: Date
}

type Project {
  id: String!
  name: String
  description: String
  root_path: String
  log_root_path: String
  sample_number: Int
  sample_x_min: Int
  sample_x_max: Int
  sample_y_min: Int
  sample_y_max: Int
  sample_z_min: Int
  sample_z_max: Int
  region_x_min: Int
  region_x_max: Int
  region_y_min: Int
  region_y_max: Int
  region_z_min: Int
  region_z_max: Int
  user_parameters: String
  plane_markers: String
  zPlaneSkipIndices: [Int]
  is_processing: Boolean
  input_source_state: Int
  last_seen_input_source: Date
  last_checked_input_source: Date
  created_at: Date
  updated_at: Date
  deleted_at: Date
  stages: [PipelineStage]
}

type PipelineTileStatus {
  incomplete: Int
  queued: Int
  processing: Int
  complete: Int
  failed: Int
  canceled: Int
}

type PipelineStage {
  id: String!
  name: String
  description: String
  function_type: Int
  execution_order: Int
  dst_path: String
  depth: Int
  is_processing: Boolean
  project_id: String
  task_id: String
  previous_stage_id: String
  project: Project
  task: TaskDefinition
  tile_status: PipelineTileStatus
  previous_stage: PipelineStage
  child_stages: [PipelineStage]
  created_at: Date
  updated_at: Date
  deleted_at: Date
}

type Tile {
  relative_path: String
  lat_x: Int
  lat_y: Int
  lat_z: Int
  prev_stage_status: Int
  this_stage_status: Int
  task_executions: [TaskExecution]
  created_at: Date
  updated_at: Date
}

type TilePage {
    offset: Int
    limit: Int
    totalCount: Int
    hasNextPage: Boolean
    items: [Tile]
}

type TileStageStatus {
  relative_path: String
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

type MutateProjectOutput {
    source: Project
    error: String
}

type DeleteProjectOutput {
    id: String
    error: String
}

type MutatePipelineStageOutput {
    source: PipelineStage
    error: String
}

type DeletePipelineStageOutput {
    id: String
    error: String
}

type MutateTaskRepositoryOutput {
    taskRepository: TaskRepository
    error: String
}

type DeleteTaskRepositoryOutput {
    id: String
    error: String
}

type MutateTaskDefinitionOutput {
    taskDefinition: TaskDefinition
    error: String
}

type DeleteTaskDefinitionOutput {
    id: String
    error: String
}

type MutatePipelineWorkerOutput {
    worker: PipelineWorker
    error: String
}

input RegionInput {
  x_min: Int
  x_max: Int
  y_min: Int
  y_max: Int
  z_min: Int
  z_max: Int
}

input ProjectInput {
  id: String
  name: String
  description: String
  root_path: String
  log_root_path: String
  sample_number: Int
  user_parameters: String
  zPlaneSkipIndices: [Int]
  input_source_state: Int
  last_seen_input_source: Float
  last_checked_input_source: Float
  is_processing: Boolean
  region_bounds: RegionInput
}

input PipelineStageInput {
  id: String
  name: String
  description: String
  function_type: Int
  execution_order: Int
  dst_path: String
  depth: Int
  is_processing: Boolean
  project_id: String
  previous_stage_id: String
  task_id: String
}

input TaskRepositoryInput {
    id: String
    name: String
    location: String
    description: String
}

input TaskDefinitionInput {
  id: String
  name: String
  description: String
  script: String
  interpreter: String
  task_repository_id: String
  script_args: String
  cluster_args: String
  expected_exit_code: Int
  local_work_units: Float
  cluster_work_units: Float
  log_prefix: String
}

input PipelineWorkerInput {
  id: String
  local_work_capacity: Float
  cluster_work_capacity: Float
}

type Query {
  schedulerHealth: SchedulerHealth

  pipelineWorker(id: String!): PipelineWorker
  pipelineWorkers: [PipelineWorker!]!

  projects: [Project!]!
  project(id: String!): Project

  pipelineStage(id: String!): PipelineStage
  pipelineStages: [PipelineStage!]!

  taskDefinition(id: String!): TaskDefinition
  taskDefinitions: [TaskDefinition!]!

  taskRepository(id: String!): TaskRepository
  taskRepositories: [TaskRepository!]!

  projectPlaneTileStatus(project_id: String, plane: Int): TilePlane

  tilesForStage(pipelineStageId: String, status: Int, offset: Int, limit: Int): TilePage

  scriptContents(task_definition_id: String): String

  pipelineVolume: String
}

type Mutation {
  createProject(project: ProjectInput): MutateProjectOutput
  updateProject(project: ProjectInput): MutateProjectOutput
  duplicateProject(id: String): MutateProjectOutput
  archiveProject(id: String!): DeleteProjectOutput

  createPipelineStage(pipelineStage: PipelineStageInput): MutatePipelineStageOutput
  updatePipelineStage(pipelineStage: PipelineStageInput): MutatePipelineStageOutput
  archivePipelineStage(id: String!): DeletePipelineStageOutput

  createTaskRepository(taskRepository: TaskRepositoryInput): MutateTaskRepositoryOutput
  updateTaskRepository(taskRepository: TaskRepositoryInput): MutateTaskRepositoryOutput
  archiveTaskRepository(id: String!): DeleteTaskRepositoryOutput

  createTaskDefinition(taskDefinition: TaskDefinitionInput): MutateTaskDefinitionOutput
  updateTaskDefinition(taskDefinition: TaskDefinitionInput): MutateTaskDefinitionOutput
  duplicateTaskDefinition(id: String): MutateTaskDefinitionOutput
  archiveTaskDefinition(id: String!): DeleteTaskDefinitionOutput

  setWorkerAvailability(id: String!, shouldBeInSchedulerPool: Boolean!): PipelineWorker
  updateWorker(worker: PipelineWorkerInput): MutatePipelineWorkerOutput

  setTileStatus(pipelineStageId: String, tileIds: [String], status: Int): [Tile]
  convertTileStatus(pipelineStageId: String, currentStatus: Int, desiredStatus: Int): [Tile]

  stopTaskExecution(pipelineStageId: String!, taskExecutionId: String!): TaskExecution
  removeTaskExecution(pipelineStageId: String!, taskExecutionId: String!): Boolean
}

schema {
  query: Query
  mutation: Mutation
}
`;
