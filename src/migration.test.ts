import { MongoClient, Db } from "mongodb";
import { Migration } from "./index";
import { classBody } from "@babel/types";

async function upStub(): Promise<void> {}

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

  afterAll(async () => {
    client.close();
  });
});
