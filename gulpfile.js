"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const gulp = require("gulp");
const shell = require("gulp-shell");
const contents = fs.readFileSync("./package.json").toString();
const npmPackage = JSON.parse(contents);
const version = npmPackage.version;
const repo = npmPackage.dockerRepository;
const imageName = npmPackage.dockerImageName || npmPackage.name;
const dockerRepoImage = `${repo}/${imageName}`;
const imageWithVersion = `${dockerRepoImage}:${version}`;
const imageAsLatest = `${dockerRepoImage}:latest`;
const buildCommand = `docker build --tag ${imageWithVersion} .`;
const tagCommand = `docker tag ${imageWithVersion} ${imageAsLatest}`;
const pushCommand = `docker push ${imageWithVersion}`;
const pushLatestCommand = `docker push ${imageAsLatest}`;
gulp.task("default", ["docker-build"]);
gulp.task("release", ["docker-push"]);
gulp.task("docker-build", shell.task([
    buildCommand,
    tagCommand
]));
gulp.task("docker-push", ["docker-build"], shell.task([
    pushCommand,
    pushLatestCommand
]));
//# sourceMappingURL=gulpfile.js.map