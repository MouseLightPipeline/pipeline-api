import * as fs from "fs";
import * as path from "path";
import uuid = require("uuid");
import {Dialect} from "sequelize";

import {RemoteDatabaseClient} from "../server/data-access/sequelize/databaseConnector";

export const SampleBrainProjectId = "44e49773-1c19-494b-b283-54466b94b70f";
export const SkeletonizationProjectId = "74f684fb-9e9f-4b2e-b853-4c43a3b92f38";

export const LineFixStageSampleBrainProjectId = "90e86015-65c9-44b9-926d-deaced40ddaa";
export const ClassifierStageSampleBrainProjectId = "828276a5-44c0-4bd1-87f7-9495bc3e9f6c";
export const DescriptorsStageSampleBrainProjectId = "5188b927-4c50-4f97-b22b-b123da78dad6";
export const PointMatchStageSampleBrainProjectId = "2683ad99-e389-41fd-a54c-38834ccc7ae9";

export const LineFixTaskDefinitionId = "ae111b6e-2187-4e07-8ccf-bc7d425d95af";
export const ClassifierTaskDefinitionId = "1ec76026-4ecc-4d25-9c6e-cdf992a05da3";
export const DescriptorsTaskDefinitionId = "a9f21399-07c0-425c-86f6-6e4f45bb06b9";
export const PointMatchTaskDefinitionId = "3ba41d1c-13d0-4def-9b5b-54d940a0fa08";

export const DefaultTaskRepositoryId = "04dbaad7-9e59-4d9e-b7b7-ae3cd1248ef9";
export const DevelopmentTaskRepositoryId = "f22c6e43-782c-4e0e-b0ca-b34fcec3340a";

export const LineFixTaskDefinitionDefaultId = "ae111b6e-2187-4e07-8ccf-bc7d425d95af";
export const DescriptorsTaskDefinitionDefaultId = "a9f21399-07c0-425c-86f6-6e4f45bb06b9";

export const DuplicateNameAppendText = " copy";
export const DuplicatePathAppendText = "-copy";

export const copyDatabase = async (): Promise<string> => {
    const tempName = `${uuid.v4()}.sqlite`;

    fs.copyFileSync(path.join(__dirname, "test-template.sqlite"), path.join(__dirname, tempName));

    await RemoteDatabaseClient.Start({
        dialect: "sqlite" as Dialect,
        storage: path.join(__dirname, tempName),
        logging: null
    });

    return tempName;
};

export const removeDatabase = (name) => {
    if (fs.existsSync(path.join(__dirname, name))) {
        fs.unlinkSync(path.join(__dirname, name));
    }
};
