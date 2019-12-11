import { MongoClient, Db } from "mongodb";
import { Migration } from "./index";
import { classBody } from "@babel/types";

async function upStub(): Promise<void> {}

async function failingUpStub(): Promise<void> {
  throw new Error("test-error");
}

async function downStub(): Promise<void> {}

let client: MongoClient;
let db: Db;
const MIGRATION_COLLECTION = "migrations";

describe("migrations", () => {
  beforeAll(async () => {
    client = await MongoClient.connect((global as any).__MONGO_URI__, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    db = client.db((global as any).__MONGO_DB_NAME__);
  });

  it("should detect non unique names in preflight", async () => {
    const migrations = [
      { up: upStub, name: "migration1" },
      { up: upStub, name: "migration1" }
    ];
    const spy1 = spyOn(migrations[0], "up").and.callThrough();
    const migrationRunner = new Migration(
      client,
      {
        collection: MIGRATION_COLLECTION
      },
      migrations
    );
    let a;
    expect((a = migrationRunner.migrate())).rejects.toThrow(
      `Migration: ${migrations[0].name} is not unique`
    );
    await a.catch(() => {
      expect(spy1).toHaveBeenCalledTimes(0);
    });
  });

  it("should detect changed order in preflight", async () => {
    const firstMigrations = [
      { up: upStub, name: "migration1" },
      { up: upStub, name: "migration2" }
    ];
    const firstMigrationRunner = new Migration(
      client,
      {
        collection: MIGRATION_COLLECTION
      },
      firstMigrations
    );
    await firstMigrationRunner.migrate();

    const migrations = [
      { up: upStub, name: "migration2" },
      { up: upStub, name: "migration1" }
    ];
    const spy1 = spyOn(migrations[0], "up").and.callThrough();
    const migrationRunner = new Migration(
      client,
      {
        collection: MIGRATION_COLLECTION
      },
      migrations
    );
    let a;
    expect((a = migrationRunner.migrate())).rejects.toThrow(
      `Migration order mismatch`
    );
    await a.catch(() => {
      expect(spy1).toHaveBeenCalledTimes(0);
    });
  });

  it("should run migrations and save artifacts", async () => {
    const migrations = [
      { up: upStub, name: "migration1" },
      { up: upStub, name: "migration2" }
    ];
    const spy1 = spyOn(migrations[0], "up").and.callThrough();
    const spy2 = spyOn(migrations[1], "up").and.callThrough();
    const migrationRunner = new Migration(
      client,
      {
        collection: MIGRATION_COLLECTION
      },
      migrations
    );
    await migrationRunner.migrate();
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
    const snapshot = await db
      .collection(MIGRATION_COLLECTION)
      .find()
      .toArray();
    expect(snapshot.length).toBe(2);
  });

  it("should run down migration on error and not save any artifacts", async () => {
    const migrations = [
      { up: upStub, name: "migration1" },
      { up: failingUpStub, down: downStub, name: "migration2" }
    ];
    const migrationRunner = new Migration(
      client,
      {
        collection: MIGRATION_COLLECTION
      },
      migrations
    );

    const spy1 = spyOn(migrations[0], "up").and.callThrough();
    const spy2 = spyOn(migrations[1], "up").and.callThrough();
    const downSpy = spyOn(migrations[1], "down").and.callThrough();
    let a;
    expect((a = migrationRunner.migrate())).rejects.toThrow("migration-error");

    await a.catch(async () => {
      expect(spy1).toHaveBeenCalledTimes(1);
      expect(spy2).toHaveBeenCalledTimes(1);
      expect(downSpy).toHaveBeenCalledTimes(1);
      const snapshot = await db
        .collection(MIGRATION_COLLECTION)
        .find()
        .toArray();
      expect(snapshot.length).toBe(1);
    });
  });

  afterEach(async () => {
    await db.collection(MIGRATION_COLLECTION).deleteMany({});
  });

  afterAll(async () => {
    await client.close();
  });
});
