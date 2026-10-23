import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
const requireApi = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { Pool } = requireApi("pg");
const { drizzle } = requireApi("drizzle-orm/node-postgres");
const { migrate } = requireApi("drizzle-orm/node-postgres/migrator");

test(
  "reset demo can be provisioned completely, rerun safely and refuses partial installations",
  { timeout: 120000 },
  async () => {
    const destination = new URL(
      process.env.DEMO_PROVISION_TEST_DATABASE_URL ??
        "postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_test",
    );
    assert.ok(
      ["127.0.0.1", "localhost"].includes(destination.hostname),
      "Local database required",
    );
    assert.ok(destination.pathname.endsWith("_test"), "Test database required");
    const name = `gym4me_provision_${randomBytes(6).toString("hex")}_test`;
    const adminUrl = new URL(destination);
    adminUrl.pathname = "/postgres";
    destination.pathname = `/${name}`;
    const admin = new Pool({ connectionString: adminUrl.toString(), max: 1 });
    let pool;
    try {
      await admin.query(`CREATE DATABASE "${name}"`);
      pool = new Pool({ connectionString: destination.toString(), max: 1 });
      await migrate(drizzle(pool), {
        migrationsFolder: root + "/apps/api/database/migrations",
      });
      // Exact state left by the user-authorized reset: schema and marker survive.
      await pool.query(`CREATE TABLE gym4me_demo_installation (id text PRIMARY KEY, ready boolean NOT NULL DEFAULT false);
      INSERT INTO gym4me_demo_installation VALUES ('isolated-demo-v1', true);
      CREATE TABLE gym4me_demo_accounts (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, phone text UNIQUE NOT NULL, label text NOT NULL);
      CREATE TABLE gym4me_demo_media (key text PRIMARY KEY, body bytea NOT NULL, content_type text NOT NULL, modified_at timestamptz NOT NULL DEFAULT now());`);
      const env = {
        ...process.env,
        DATABASE_URL: destination.toString(),
        AUTH_SECRET: randomBytes(48).toString("hex"),
        NODE_ENV: "test",
        DEMO_MODE: "true",
        DEMO_PROVISION_CONFIRM: "gym4me-demo-postgres",
        DEMO_SHOWCASE_CONFIRM: "gym4me-visual-catalog-v1",
        SMS_PROVIDER: "disabled",
        KAVENEGAR_API_KEY: "",
        PUSH_PROVIDER: "disabled",
        RETENTION_ENABLED: "false",
        TS_NODE_TRANSPILE_ONLY: "true",
        NODE_OPTIONS: "--max-old-space-size=512",
      };
      function seed(script = "seed-demo") {
        return new Promise((resolve, reject) => {
          const child = spawn(
            process.execPath,
            ["-r", "ts-node/register", `scripts/${script}.ts`],
            { cwd: root + "/apps/api", env, stdio: ["ignore", "pipe", "pipe"] },
          );
          let output = "";
          child.stdout.on("data", (b) => {
            output += b;
          });
          child.stderr.on("data", (b) => {
            output += b;
          });
          child.once("error", reject);
          child.once("close", (code) => resolve({ code, output }));
        });
      }
      const first = await seed();
      assert.equal(first.code, 0, first.output);
      const snapshot = async () =>
        (
          await pool.query(
            `SELECT (SELECT count(*)::int FROM users) users, (SELECT count(*)::int FROM gym4me_demo_accounts) accounts, (SELECT count(*)::int FROM organizations) organizations, (SELECT count(*)::int FROM sport_services) services, (SELECT count(*)::int FROM sport_occurrences) occurrences`,
          )
        ).rows[0];
      const before = await snapshot();
      assert.equal(before.users, 8);
      assert.equal(before.accounts, 8);
      assert.equal(before.organizations, 2);
      assert.ok(before.services >= 6);
      assert.ok(before.occurrences > 0);
      const copy = (
        await pool.query(
          `SELECT display_name AS text FROM users UNION ALL SELECT description FROM clubs UNION ALL SELECT jsonb_build_array(title,description,policy->>'terms',coach_name)::text FROM sport_service_versions`,
        )
      ).rows
        .map((row) => row.text)
        .join("\n");
      assert.doesNotMatch(copy, /دمو|آزمایشی|تستی|نمونه|بررسی رابط/);
      await pool.query(
        "UPDATE users SET display_name='Saved rehearsal edit' WHERE phone='+989000000003'",
      );
      const again = await seed();
      assert.equal(again.code, 0, again.output);
      assert.deepEqual(await snapshot(), before);
      assert.equal(
        (
          await pool.query(
            "SELECT display_name FROM users WHERE phone='+989000000003'",
          )
        ).rows[0].display_name,
        "Saved rehearsal edit",
      );
      // A lost connection between creating, publishing and scheduling a court
      // must not leave an unusable draft on the next explicit provisioning run.
      const court = (
        await pool.query(
          "SELECT id FROM sport_services WHERE kind='court' ORDER BY id LIMIT 1",
        )
      ).rows[0];
      await pool.query(
        "DELETE FROM sport_occupancies WHERE occurrence_id IN(SELECT id FROM sport_occurrences WHERE service_id=$1)",
        [court.id],
      );
      await pool.query("DELETE FROM sport_occurrences WHERE service_id=$1", [
        court.id,
      ]);
      await pool.query(
        "UPDATE sport_services SET status='draft',revision=1,published_version_id=NULL WHERE id=$1",
        [court.id],
      );
      const resumed = await seed();
      assert.equal(resumed.code, 0, resumed.output);
      assert.equal(
        (
          await pool.query("SELECT status FROM sport_services WHERE id=$1", [
            court.id,
          ])
        ).rows[0].status,
        "published",
      );
      assert.deepEqual(await snapshot(), before);
      for (const script of ["provision-demo-ph4", "provision-demo-showcase"]) {
        const result = await seed(script);
        assert.equal(result.code, 0, result.output);
      }
      const complete = await snapshot();
      assert.equal(complete.users, 12);
      assert.equal(complete.organizations, 8);
      const pendingPlan = (
        await pool.query(
          "SELECT id FROM training_plans WHERE title='۲۰ دقیقه برای خودم'",
        )
      ).rows[0];
      await pool.query(
        "UPDATE training_plans SET revision=1,draft=(SELECT content FROM training_versions WHERE plan_id=$1 ORDER BY version DESC LIMIT 1) WHERE id=$1",
        [pendingPlan.id],
      );
      await pool.query("DELETE FROM training_versions WHERE plan_id=$1", [
        pendingPlan.id,
      ]);
      const resumedCatalog = await seed("provision-demo-showcase");
      assert.equal(resumedCatalog.code, 0, resumedCatalog.output);
      assert.deepEqual(await snapshot(), complete);
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int count FROM training_versions WHERE plan_id=$1",
            [pendingPlan.id],
          )
        ).rows[0].count,
        1,
      );
      const visibleCopy = (
        await pool.query(
          `SELECT display_name AS text FROM users UNION ALL SELECT description FROM clubs UNION ALL SELECT jsonb_build_array(title,description,policy->>'terms',coach_name)::text FROM sport_service_versions`,
        )
      ).rows
        .map((row) => row.text)
        .join("\n");
      assert.doesNotMatch(visibleCopy, /دمو|آزمایشی|تستی|نمونه|بررسی رابط/);
      await pool.query(
        "UPDATE gym4me_demo_installation SET ready=false WHERE id='isolated-demo-v1'",
      );
      const partial = await seed();
      assert.equal(partial.code, 1);
      assert.match(
        partial.output,
        /Refusing to seed a non-empty user database/,
      );
      assert.deepEqual(await snapshot(), complete);
    } finally {
      await pool?.end();
      await admin.query(`DROP DATABASE IF EXISTS "${name}"`);
      await admin.end();
    }
  },
);
