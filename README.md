# Pipeline Coordinator Service
This service is the Mouse Light Acquisition Pipeline Coordinator.  It manages pipeline projects, pipeline stages for those projects, and the task definitions
that define units of work for the stages.

#### Dependencies
The Pipeline Database service must be running to synchronize task definitions between this service and any workers.

# Installation
The service can be run standalone or within a Docker container.

In either case there four environment variables that can be used to override the default values for connecting to the pipeline database
server.  These also apply to the migrations and seeding sections below.
* `PIPELINE_DATABASE_HOST` (default "pipeline-db")
* `PIPELINE_DATABASE_PORT` (default 5432)
* `PIPELINE_DATABASE_USER` (default postgres)
* `PIPELINE_DATABASE_PASS` (default pgsecret)

When using the container on the same host as the database container the default values can be used.

When running standalone and the system entirely on localhost (*e.g.*, during development), or when running
the container distributed from the database container, at a minimum `PIPELINE_DATABASE_HOST` must be set.

For production the postgres user/pass should of course be changed.

#### Standalone
As a standalone service it requires node 7.10 or later. 

Outside of a container the service can be started in a number of ways
* `run.sh` ensures that all migrations are up to date and uses nohup to facilitate disconnecting from the session
* `npm run start` or `npm run devel` for production or development mode (node debugger attachment and debug messages) without migration checks
* `docker-entry.sh` ensures that all migrations are up to date and launches the node process and sleeps

`run.sh` is useful for starting from an interactive session where you plan to disconnect.

`docker-entry.sh` may be useful where nohup is not necessary and/or you want the script to stay alive.   For example, this is
 used by the container where the sleep is required to keep the container active.

#### Container

As a container the service only requires that Docker be installed.  The container can be started via docker-compose (see the server-prod
repository as an example) or directly from the `docker` command.

The container has the same startup options as the standalone via the `CMD` compose property or `docker run` command line 
argument, but defaults to `start.sh`.

The offline database is stored in /app/internal-data.  To persist offline data between container updates, map this directory to
a host volume or data volume.  This is required as the offline database only synchronizes task information from the coordinator
database at this time - *it does not sync project and stage information*.

### Migrations
Database migrations for both the offline and coordinator database can be run manually using `migrate.sh`.  This can be done
for a standalone instance directly, or via `docker run` as the command.

By default the coordinator database configuration assumes a host of `pipeline-db` and port `5432`.  To migrate localhost or a different
remote database and or use a different port, pass the host and port as argument to the script or set the `PIPELINE_DATABASE_HOST`
and/or `PIPELINE_DATABASE_PORT` environment variables.

#### Seeding
There are default seed data sets with sample projects and tasks for "development" and "production" environments.

By default the coordinator database configuration assumes a host of `pipeline-db` and port `5432`.  To migrate any other
configuration, pass the host and port as arguments to the script or set the `PIPELINE_DATABASE_HOST` an
 `PIPELINE_DATABASE_PORT` environment variables directly.

The default seed is the production seed.  To use the development seed, pass "development" as the third argument to the
script, or set the `PIPELINE_SEED_ENV` environment variable directly.  Note that if you use as the third argument you
must pass the correct/valid host and port information as the first two arguments, even if environment variables are set.

### Example Installations

The simplest method to be up and running is using Docker Compose and the services-prod repository configuration.  This 
will launch this service, the graphical front end server for this service, and all supporting services such as the 
pipeline database.

#### Local Development
The following assumes that the pipeline database is run via the services-prod repo Docker Compose configuration.  

You can also run a postgres server anywhere/way that contains a pipeline_production database, but you must change any
values for the pipeline database host and port from localhost and 4432 below to their appropriate values if different.

1. Start the pipeline database using the server-prod repo and the `up.sh` script to start all background services and
data volumes via Docker Compose.
2. Stop this api service container via `docker stop <container_id>`.  You can find the id for the pipeline_api container using `docker ps`
3. If this is the first launch, or if a new migration has been added, use the `migrate.sh` script as `./migrate.sh localhost 3932`.
4. If this is the first launch, optionally seed the database to get up and running quickly using `./seed.sh localhost 3932`
5. Launch using `npm run devel` 
