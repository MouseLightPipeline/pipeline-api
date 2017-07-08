"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
module.exports = {
    up: (queryInterface, Sequelize) => __awaiter(this, void 0, void 0, function* () {
        yield queryInterface.createTable("TaskRepositories", {
            id: {
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            name: Sequelize.TEXT,
            description: Sequelize.TEXT,
            location: Sequelize.TEXT,
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
            deleted_at: Sequelize.DATE
        });
        yield queryInterface.createTable("TaskDefinitions", {
            id: {
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            name: Sequelize.TEXT,
            description: Sequelize.TEXT,
            script: Sequelize.TEXT,
            interpreter: Sequelize.TEXT,
            args: Sequelize.TEXT,
            work_units: Sequelize.DOUBLE,
            task_repository_id: {
                type: Sequelize.UUID,
                references: {
                    model: "TaskRepositories",
                    key: "id"
                }
            },
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
            deleted_at: Sequelize.DATE
        });
        yield queryInterface.createTable("PipelineWorkers", {
            id: {
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            machine_id: Sequelize.UUID,
            name: Sequelize.TEXT,
            address: Sequelize.TEXT,
            port: Sequelize.INTEGER,
            os_type: Sequelize.TEXT,
            platform: Sequelize.TEXT,
            arch: Sequelize.TEXT,
            release: Sequelize.TEXT,
            cpu_count: Sequelize.INTEGER,
            total_memory: Sequelize.DOUBLE,
            free_memory: Sequelize.DOUBLE,
            load_average: Sequelize.DOUBLE,
            work_unit_capacity: Sequelize.DOUBLE,
            is_in_scheduler_pool: Sequelize.BOOLEAN,
            is_cluster_proxy: Sequelize.BOOLEAN,
            last_seen: Sequelize.DATE,
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
            deleted_at: Sequelize.DATE
        });
        yield queryInterface.createTable("Projects", {
            id: {
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            name: Sequelize.TEXT,
            description: Sequelize.TEXT,
            root_path: Sequelize.TEXT,
            sample_number: Sequelize.INTEGER,
            sample_x_min: Sequelize.INTEGER,
            sample_x_max: Sequelize.INTEGER,
            sample_y_min: Sequelize.INTEGER,
            sample_y_max: Sequelize.INTEGER,
            sample_z_min: Sequelize.INTEGER,
            sample_z_max: Sequelize.INTEGER,
            region_x_min: Sequelize.INTEGER,
            region_x_max: Sequelize.INTEGER,
            region_y_min: Sequelize.INTEGER,
            region_y_max: Sequelize.INTEGER,
            region_z_min: Sequelize.INTEGER,
            region_z_max: Sequelize.INTEGER,
            is_processing: Sequelize.BOOLEAN,
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
            deleted_at: Sequelize.DATE
        });
        yield queryInterface.createTable("PipelineStages", {
            id: {
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            name: Sequelize.TEXT,
            description: Sequelize.TEXT,
            function_type: Sequelize.INTEGER,
            dst_path: Sequelize.TEXT,
            is_processing: Sequelize.BOOLEAN,
            depth: Sequelize.INTEGER,
            project_id: {
                type: Sequelize.UUID,
                references: {
                    model: "Projects",
                    key: "id"
                }
            },
            task_id: {
                type: Sequelize.UUID,
                references: {
                    model: "TaskDefinitions",
                    key: "id"
                }
            },
            previous_stage_id: {
                type: Sequelize.UUID,
                references: {
                    model: "PipelineStages",
                    key: "id"
                }
            },
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
            deleted_at: Sequelize.DATE
        });
        yield queryInterface.createTable("PipelineStagePerformances", {
            id: {
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            num_in_process: Sequelize.INTEGER,
            num_ready_to_process: Sequelize.INTEGER,
            num_execute: Sequelize.INTEGER,
            num_complete: Sequelize.INTEGER,
            num_error: Sequelize.INTEGER,
            num_cancel: Sequelize.INTEGER,
            duration_average: Sequelize.DOUBLE,
            duration_high: Sequelize.DOUBLE,
            duration_low: Sequelize.DOUBLE,
            cpu_average: Sequelize.DOUBLE,
            cpu_high: Sequelize.DOUBLE,
            cpu_low: Sequelize.DOUBLE,
            memory_average: Sequelize.DOUBLE,
            memory_high: Sequelize.DOUBLE,
            memory_low: Sequelize.DOUBLE,
            pipeline_stage_id: {
                type: Sequelize.UUID,
                references: {
                    model: "PipelineStages",
                    key: "id"
                }
            },
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
            deleted_at: Sequelize.DATE
        });
        yield queryInterface.createTable("PipelineStageFunctions", {
            id: {
                primaryKey: true,
                type: Sequelize.INTEGER,
                defaultValue: Sequelize.UUIDV4
            },
            name: Sequelize.TEXT,
            created_at: Sequelize.DATE,
            updated_at: Sequelize.DATE,
            deleted_at: Sequelize.DATE
        });
    }),
    down: (queryInterface, Sequelize) => __awaiter(this, void 0, void 0, function* () {
        yield queryInterface.dropTable("PipelineStageFunctions");
        yield queryInterface.dropTable("PipelineStagePerformances");
        yield queryInterface.dropTable("PipelineStages");
        yield queryInterface.dropTable("Projects");
        yield queryInterface.dropTable("PipelineWorkers");
        yield queryInterface.dropTable("TaskDefinitions");
        yield queryInterface.dropTable("TaskRepositories");
    })
};
//# sourceMappingURL=20170310223354-initialize.js.map