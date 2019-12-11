/* eslint-disable @typescript-eslint/no-var-requires */
const NodeEnvironment = require("jest-environment-node");
const { MongoMemoryServer } = require("mongodb-memory-server");

class MongoEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
    this.mongod = new MongoMemoryServer();
  }

  async setup() {
    this.global.__MONGO_URI__ = await this.mongod.getConnectionString();
    this.global.__MONGO_DB_NAME__ = await this.mongod.getDbName();
    await super.setup();
  }

  async teardown() {
    await this.mongod.stop();
    await super.teardown();
  }
}

module.exports = MongoEnvironment;
