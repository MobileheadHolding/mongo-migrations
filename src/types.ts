import { Db } from "mongodb";

export type MigrationFile = {
  // unique name of migration file
  name: string;
  // method to be run if the previous one succeeds
  up: (db: Db) => Promise<void>;
  // method to be run if the current one failed
  down?: (db: Db) => Promise<void>;
};

export type MigrationOptions = {
  // the collection used to keep track of migrations
  collection: string;
};

export type MigrationDocument = {
  step: number;
  name: string;
};
