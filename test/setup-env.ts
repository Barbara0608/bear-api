// Point the e2e tests at a dedicated test database
process.env.DB_NAME ??= 'bears_test';
process.env.DB_SYNCHRONIZE ??= 'true';
