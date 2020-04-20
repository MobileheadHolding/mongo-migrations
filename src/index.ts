import { Db } from "mongodb";
import { MigrationFile, MigrationOptions, MigrationDocument } from "./types";

function expectUniqueNames(migrations: MigrationFile[]) {
  const temp = [];
  for (const migration of migrations) {
    if (!temp.find(m => m.name === migration.name)) temp.push(migration);
    else throw new Error(`Migration: ${migration.name} is not unique`);
  }
  return true;
}

function expectCorrectOrder(
  migrations: MigrationFile[],
  existingMigrations: MigrationDocument[]
) {
  if (
    existingMigrations.some(
      (migration, index) => migration.name !== migrations[index].name
    )
  ) {
    throw new Error(`Migration order mismatch`);
  }
  return true;
}

export class Migration {
  private db: Db;
  private options: MigrationOptions;
  private migrations: MigrationFile[] = [];

  constructor(db: Db, options: MigrationOptions, migrations?: MigrationFile[]) {
    this.db = db;
    this.options = options;
    this.migrations = migrations;
  }

  /**
   * checks for common problems in migration files before starting the actual migrations
   * 1. if all migration names are unique
   * 2. if the migration order is maintained
   */
  private preFlightTest(existingMigrations: MigrationDocument[]) {
    expectUniqueNames(this.migrations);
    expectCorrectOrder(this.migrations, existingMigrations);
  }

  /**
   * checks if a certain migration has already been run in the past
   * @param migration
   * @param existingMigrations
   */
  private shouldRunMigration(
    migration: MigrationFile,
    existingMigrations: MigrationDocument[]
  ) {
    return !existingMigrations.find(m => m.name === migration.name);
  }

  /**
   * executes a migrations `up` function and `down` function in case there was an error
   * @param migration
   * @param db
   */
  private async runMigration(migration: MigrationFile, db: Db) {
    await migration.up(db).catch(async e => {
      console.error("failed up migration:", migration.name, e);
      if (migration.down) {
        await migration.down(db).catch(e => {
          console.error("failed down migration:", migration.name, e);
        });
      }
      throw new Error(`migration-error`);
    });
  }

  /**
   * can be used to add migrations after initialization
   * @param migrations
   */
  public addMigrations(migrations: MigrationFile[]) {
    this.migrations = [...this.migrations, ...migrations];
  }

  /**
   * executes the migration
   */
  public async migrate() {
    const db = this.db;
    const migrationCollection = db.collection(this.options.collection);
    const existingMigrations = await migrationCollection
      .find<MigrationDocument>()
      .sort({ step: 1 })
      .toArray();

    this.preFlightTest(existingMigrations);

    for (let i = 0; i < this.migrations.length; i++) {
      const currentMigration = this.migrations[i];
      if (this.shouldRunMigration(currentMigration, existingMigrations)) {
        console.info(`executing migration ${currentMigration.name}`);
        await this.runMigration(currentMigration, db);
        await migrationCollection.insertOne({
          name: currentMigration.name,
          step: i,
          createdAt: new Date()
        });
      }
    }
    console.info("finished migration process");
  }
}

export * from "./types";
