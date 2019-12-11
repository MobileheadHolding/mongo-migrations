module.exports = {
  preset: "ts-jest",
  testEnvironment: "./jest.mongo.environment",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  roots: ["<rootDir>"]
};
