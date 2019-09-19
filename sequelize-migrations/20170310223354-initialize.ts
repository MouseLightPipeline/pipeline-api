export = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable(
            "TaskRepositories",
            {
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

        await queryInterface.createTable(
            "TaskDefinitions",
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                name: Sequelize.TEXT,
                description: Sequelize.TEXT,
                script: Sequelize.TEXT,
                interpreter: Sequelize.TEXT,
                script_args: Sequelize.TEXT,
                cluster_args: Sequelize.TEXT,
                expected_exit_code: Sequelize.INTEGER,
                local_work_units: Sequelize.DOUBLE,
                cluster_work_units: Sequelize.DOUBLE,
                log_prefix: Sequelize.TEXT,
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

        await queryInterface.createTable(
            "PipelineWorkers",
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                worker_id: Sequelize.UUID,
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
                local_work_capacity: Sequelize.DOUBLE,
                cluster_work_capacity: Sequelize.DOUBLE,
                is_in_scheduler_pool: Sequelize.BOOLEAN,
                last_seen: Sequelize.DATE,
                created_at: Sequelize.DATE,
                updated_at: Sequelize.DATE,
                deleted_at: Sequelize.DATE
            });

        await queryInterface.createTable(
            "Projects",
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                name: Sequelize.TEXT,
                description: {
                    type: Sequelize.TEXT,
                    defaultValue: ""
                },
                sample_number: {
                    type: Sequelize.INTEGER,
                    defaultValue: -1
                },
                root_path: {
                    type: Sequelize.TEXT,
                    defaultValue: ""
                },
                log_root_path: {
                    type: Sequelize.TEXT,
                    defaultValue: ""
                },
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
                user_parameters: {
                    type: Sequelize.TEXT,
                    defaultValue: "{}"
                },
                plane_markers: {
                    type: Sequelize.TEXT,
                    defaultValue: `{"x": [], "y": [], "z": []}`
                },
                is_processing: {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                },
                input_source_state: {
                    type: Sequelize.INTEGER,
                    defaultValue: 0
                },
                last_seen_input_source: Sequelize.DATE,
                last_checked_input_source: Sequelize.DATE,
                created_at: Sequelize.DATE,
                updated_at: Sequelize.DATE,
                deleted_at: Sequelize.DATE
            });

        await queryInterface.createTable(
            "PipelineStages",
            {
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
                user_parameters: {
                    type: Sequelize.TEXT,
                    defaultValue: "{}"
                },
                created_at: Sequelize.DATE,
                updated_at: Sequelize.DATE,
                deleted_at: Sequelize.DATE
            });

        await queryInterface.createTable(
            "PipelineStageFunctions",
            {
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
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("PipelineStageFunctions");
        await queryInterface.dropTable("PipelineStagePerformances");
        await queryInterface.dropTable("PipelineStages");
        await queryInterface.dropTable("Projects");
        await queryInterface.dropTable("PipelineWorkers");
        await queryInterface.dropTable("TaskDefinitions");
        await queryInterface.dropTable("TaskRepositories");
        // await queryInterface.dropTable("TaskExecutions");
    }
};
