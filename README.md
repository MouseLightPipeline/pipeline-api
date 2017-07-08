# Pipeline Coordinator Service
The service is the Mouse Light Acquisition Pipeline Coordinator.  It manages pipeline projects, pipeline stages for those projects, and the task definitions
that define units of work for the stages.

#### Dependencies
The Pipeline Database service must be running to synchronize task definitions between this service and any workers.

# Installation
The service can be run standalone or within a Docker container.

In either case there four environment variables that can be used to override the default values for connecting to the pipeline database
server.  These also apply to the migrations and seeding sections below.
* ```PIPELINE_DATABASE_HOST``` (default "localhost")
* ```PIPELINE_DATABASE_PORT``` (default 4432)
* ```PIPELINE_DATABASE_USER``` (default postgres)
* ```PIPELINE_DATABASE_PASS``` (default pgsecret)

When running standalone and the system entirely on localhost (*e.g.*, during development) the default values can be used.

When using the container, or when running standalone but distributed, at a minimum ```PIPELINE_DATABASE_HOST``` must be set.

For production the postgres user/pass should of course be changed.

#### Standalone
As a standalone service it requires minimum node version 7.10. 

Outside of a container the service can be started in a number of ways
* ```start.sh``` ensures that all migrations are up to date and launches the node process
* ```bg_start.sh``` ensures that all migrations are up to date and uses nohup to facilitate disconnecting from the session
* ```npm run start``` or ```npm run dev``` for production or development mode (node debugger attachment and debug messages)

#### Container

As a container the service only requires that Docker be installed.  The container can be started via docker-compose (see the server-prod
repository as an example) or directly from the ```docker command```.

The container has the same startup options as the standalone via the CMD compose property or command line argument and defaults
to ```start.sh```.

The offline database is stored in /app/internal-data.  To persist offline data between container updates, map this directory to
a host volume or data volume.  This is required as the offline database only synchronizes task information from the coordinator
database at this time.

### Migrations
Database migrations for both the offline and coordinator database can be run manually using ```migrate.sh```, either for a standalone
instance directly, or via ```docker run``` as the command.

By default the coordinator database configuration assumes localhost.  To migrate a remote database pass the host as an argument to the
script or set the ```PIPELINE_DATABASE_HOST``` environment variable.

#### Seeding
There are default seed data sets with sample projects and tasks for "development" and "production" environments.

By default the coordinator database configuration assumes localhost.  To migrate a remote database, pass the host as an argument to the
script or set the ```PIPELINE_DATABASE_HOST``` environment variable directly.

The default seed is the production seed.  To use the development seed, pass "development" as the second argument to the script, or set
the ```PIPELINE_SEED_ENV``` environment variable directly.

### Example Installations

**Local Operation Development**
1. Start the pipeline database.  The simplest method is via the server-prod repo and the ```up.sh``` script to start all background
services and data volumes.  Alternatively, run a postgres server anywhere/way you want that contains a pipeline_production database.
2. 