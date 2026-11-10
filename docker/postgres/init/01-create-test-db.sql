-- Runs once, when the Postgres volume is first created.
-- Separate database for the e2e tests, which empty their tables before each test.
CREATE DATABASE bears_test;
