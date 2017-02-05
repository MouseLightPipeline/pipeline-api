export interface IConfiguration<T> {
    development: T;
    staging: T;
    test: T;
    production: T;
}