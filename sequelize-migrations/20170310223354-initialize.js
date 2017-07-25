"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
module.exports = {
    up: function (queryInterface, Sequelize) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queryInterface.createTable("TaskRepositories", {
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
                    })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.createTable("TaskDefinitions", {
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
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.createTable("PipelineWorkers", {
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
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.createTable("Projects", {
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
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.createTable("PipelineStages", {
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
                        })];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.createTable("PipelineStagePerformances", {
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
                        })];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.createTable("PipelineStageFunctions", {
                            id: {
                                primaryKey: true,
                                type: Sequelize.INTEGER,
                                defaultValue: Sequelize.UUIDV4
                            },
                            name: Sequelize.TEXT,
                            created_at: Sequelize.DATE,
                            updated_at: Sequelize.DATE,
                            deleted_at: Sequelize.DATE
                        })];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    down: function (queryInterface, Sequelize) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queryInterface.dropTable("PipelineStageFunctions")];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.dropTable("PipelineStagePerformances")];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.dropTable("PipelineStages")];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.dropTable("Projects")];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.dropTable("PipelineWorkers")];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.dropTable("TaskDefinitions")];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.dropTable("TaskRepositories")];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }
};
