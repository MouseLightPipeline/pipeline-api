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
var seedEnv = process.env.PIPELINE_SEED_ENV || "production";
var isProduction = seedEnv === "production";
function createTaskRepositories(when) {
    if (isProduction) {
        return [{
                id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
                name: "Default",
                description: "Default task repository.",
                location: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/taskdefinitions/default",
                created_at: when
            }];
    }
    else {
        return [{
                id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
                name: "Default",
                description: "Default task repository.",
                location: "../taskdefinitions/default",
                created_at: when
            }, {
                id: "f22c6e43-782c-4e0e-b0ca-b34fcec3340a",
                description: "Development task repository.",
                location: "../taskdefinitions/development",
                created_at: when
            }];
    }
}
function createTaskDefinitions(when) {
    if (isProduction) {
        return [{
                id: "04b8313e-0e96-4194-9c06-22771acd3986",
                name: "Echo",
                description: "Simple command to test shell worker execution.  Will echo the passed arguments.",
                script: "tasks/echo.sh",
                interpreter: "none",
                args: "",
                work_units: 0,
                task_repository_id: null,
                created_at: when
            }, {
                id: "1161f8e6-29d5-44b0-b6a9-8d3e54d23292",
                name: "Axon UInt16",
                description: "Axon UInt16",
                script: "axon-uint16.sh",
                interpreter: "none",
                args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps",
                work_units: 4,
                task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
                created_at: when
            }, {
                id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
                name: "dogDescriptor",
                description: "",
                script: "dogDescriptor.sh",
                interpreter: "none",
                args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps",
                work_units: 2,
                task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
                created_at: when
            }, {
                id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
                name: "getDescriptorPerTile",
                description: "",
                script: "getDescriptorPerTile.sh",
                interpreter: "none",
                args: "/groups/mousebrainmicro/mousebrainmicro/Software/pipeline/apps",
                work_units: 1,
                task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
                created_at: when
            }];
    }
    else {
        return [{
                id: "04b8313e-0e96-4194-9c06-22771acd3986",
                name: "Echo",
                description: "Simple command to test shell worker execution.  Will echo all arguments.",
                script: "tasks/echo.sh",
                interpreter: "none",
                args: "\"custom arg 1\" \"custom arg 2\"",
                work_units: 0,
                task_repository_id: null,
                created_at: when
            }, {
                id: "1ec76026-4ecc-4d25-9c6e-cdf992a05da3",
                name: "ilastik Pixel Classifier Test",
                description: "Calls ilastik with test project.",
                script: "tasks/pixel_shell.sh",
                interpreter: "none",
                args: "test/pixel_classifier_test",
                work_units: 4,
                task_repository_id: null,
                created_at: when
            }, {
                id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
                name: "dogDescriptor",
                description: "",
                script: "dogDescriptor.sh",
                interpreter: "none",
                args: "/Volumes/Spare/Projects/MouseLight/Apps/Pipeline/dogDescriptor /groups/mousebrainmicro/mousebrainmicro/Software/mcr/v90",
                work_units: 2,
                task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
                created_at: when
            }, {
                id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
                name: "getDescriptorPerTile",
                description: "",
                script: "getDescriptorPerTile.sh",
                interpreter: "none",
                args: "/Volumes/Spare/Projects/MouseLight/Apps/Pipeline/dogDescriptor/getDescriptorPerTile /groups/mousebrainmicro/mousebrainmicro/Software/mcr/v90",
                work_units: 1,
                task_repository_id: "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9",
                created_at: when
            }];
    }
}
function createProjects(when) {
    if (isProduction) {
        return [{
                id: "44e49773-1c19-494b-b283-54466b94b70f",
                name: "Sample Brain",
                description: "Sample brain pipeline project",
                root_path: "/groups/mousebrainmicro/mousebrainmicro/from_tier2/data/2016-10-31/Tiling",
                sample_number: 99998,
                region_x_min: 277,
                region_x_max: 281,
                region_y_min: 35,
                region_y_max: 39,
                region_z_min: 388,
                region_z_max: 392,
                is_processing: false,
                created_at: when
            }];
    }
    else {
        return [{
                id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
                name: "Small",
                description: "Small dashboard.json test project",
                root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/small",
                sample_number: 99998,
                region_x_min: null,
                region_x_max: null,
                region_y_min: null,
                region_y_max: null,
                region_z_min: null,
                region_z_max: null,
                is_processing: false,
                created_at: when
            }, {
                id: "f106e72c-a43e-4baf-a6f0-2395a22a65c6",
                name: "Small SubGrid",
                description: "Small dashboard.json test project",
                root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/small",
                sample_number: 99998,
                region_x_min: 1,
                region_x_max: 2,
                region_y_min: 0,
                region_y_max: 3,
                region_z_min: 2,
                region_z_max: null,
                is_processing: false,
                created_at: when
            }, {
                id: "b7b7952c-a830-4237-a3de-dcd2a388a04a",
                name: "Large",
                description: "Large dashboard.json test project",
                root_path: "/Volumes/Spare/Projects/MouseLight/Dashboard Output/large",
                sample_number: 99999,
                region_x_min: null,
                region_x_max: null,
                region_y_min: null,
                region_y_max: null,
                region_z_min: null,
                region_z_max: null,
                is_processing: false,
                created_at: when
            }];
    }
}
function createPipelineStages(when) {
    if (isProduction) {
        return [{
                id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
                name: "Classifier",
                description: "Classifier",
                dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_1_classifier_output",
                function_type: 2,
                is_processing: false,
                depth: 1,
                project_id: "44e49773-1c19-494b-b283-54466b94b70f",
                task_id: "1161f8e6-29d5-44b0-b6a9-8d3e54d23292",
                previous_stage_id: null,
                created_at: when
            }, {
                id: "5188b927-4c50-4f97-b22b-b123da78dad6",
                name: "Descriptors",
                description: "Descriptors",
                dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_2_descriptor_output",
                function_type: 2,
                is_processing: false,
                depth: 2,
                project_id: "44e49773-1c19-494b-b283-54466b94b70f",
                task_id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
                previous_stage_id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
                created_at: when
            }, {
                id: "2683ad99-e389-41fd-a54c-38834ccc7ae9",
                name: "Merge Descriptors",
                description: "Descriptor Merge",
                dst_path: "/nrs/mouselight/pipeline_output/2016-10-31-jan-demo/stage_3_descriptor_merge",
                function_type: 2,
                is_processing: false,
                depth: 3,
                project_id: "44e49773-1c19-494b-b283-54466b94b70f",
                task_id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
                previous_stage_id: "5188b927-4c50-4f97-b22b-b123da78dad6",
                created_at: when
            }];
    }
    else {
        return [{
                id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
                name: "Classifier",
                description: "Classifier",
                dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput1",
                function_type: 2,
                is_processing: false,
                depth: 1,
                project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
                task_id: "1ec76026-4ecc-4d25-9c6e-cdf992a05da3",
                previous_stage_id: null,
                created_at: when
            }, {
                id: "5188b927-4c50-4f97-b22b-b123da78dad6",
                name: "Descriptors",
                description: "Descriptors",
                dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput2",
                function_type: 2,
                is_processing: false,
                depth: 2,
                project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
                task_id: "a9f21399-07c0-425c-86f6-6e4f45bb06b9",
                previous_stage_id: "828276a5-44c0-4bd1-87f7-9495bc3e9f6c",
                created_at: when
            }, {
                id: "2683ad99-e389-41fd-a54c-38834ccc7ae9",
                name: "Merge Descriptors",
                description: "Descriptor Merge",
                dst_path: "/Volumes/Spare/Projects/MouseLight/PipelineOutput3",
                function_type: 2,
                is_processing: false,
                depth: 3,
                project_id: "af8cb0d4-56c0-4db8-8a1b-7b39540b2d04",
                task_id: "3ba41d1c-13d0-4def-9b5b-54d940a0fa08",
                previous_stage_id: "5188b927-4c50-4f97-b22b-b123da78dad6",
                created_at: when
            }];
    }
}
function createPipelineStageFunction(when) {
    return [{
            id: 1,
            name: "Refresh Dashboard Project",
            created_at: when
        }, {
            id: 2,
            name: "Map Tile",
            created_at: when
        }, {
            id: 3,
            name: "Map With Z Index - 1 Tile",
            created_at: when
        }];
}
module.exports = {
    up: function (queryInterface, Sequelize) { return __awaiter(_this, void 0, void 0, function () {
        var when;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    when = new Date();
                    return [4 /*yield*/, queryInterface.bulkInsert("TaskRepositories", createTaskRepositories(when), {})];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.bulkInsert("TaskDefinitions", createTaskDefinitions(when), {})];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.bulkInsert("Projects", createProjects(when), {})];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.bulkInsert("PipelineStages", createPipelineStages(when), {})];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.bulkInsert("PipelineStageFunctions", createPipelineStageFunction(when), {})];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    down: function (queryInterface, Sequelize) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, queryInterface.bulkDelete("PipelineStageFunctions", null, {})];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.bulkDelete("PipelineStages", null, {})];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.bulkDelete("Projects", null, {})];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.bulkDelete("TaskDefinitions", null, {})];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, queryInterface.bulkDelete("askRepositories", null, {})];
                case 5:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }
};
