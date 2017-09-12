export = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("TaskExecutions",
            {
                id: {
                    primaryKey: true,
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4
                },
                worker_id: Sequelize.UUID,
                work_units: Sequelize.DOUBLE,
                resolved_script: Sequelize.TEXT,
                resolved_interpreter: Sequelize.TEXT,
                resolved_args: Sequelize.TEXT,
                max_memory: Sequelize.DOUBLE,
                max_cpu: Sequelize.DOUBLE,
                execution_status_code: Sequelize.INTEGER,
                completion_status_code: Sequelize.INTEGER,
                last_process_status_code: Sequelize.INTEGER,
                exit_code: Sequelize.INTEGER,
                started_at: Sequelize.DATE,
                completed_at: Sequelize.DATE,
                sync_status: Sequelize.INTEGER,
                synchronized_at: Sequelize.DATE,
                created_at: Sequelize.DATE,
                updated_at: Sequelize.DATE,
                deleted_at: Sequelize.DATE,
                task_definition_id: {
                    type: Sequelize.UUID,
                    references: {
                        model: "TaskDefinitions",
                        key: "id"
                    }
                }
            });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("TaskExecutions");
    }
};
