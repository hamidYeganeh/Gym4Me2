import { connect } from 'node:net';

/** The default UI preview and PostgreSQL test suites both use gym4me_test. */
export async function uiFixtureIsRunning(port = 7088) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    let settled = false;
    const finish = (running) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(running);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}

if (process.argv[1]?.endsWith('check-ui-fixture.mjs')) {
  const databaseName = new URL(
    process.env.TEST_DATABASE_URL ??
      'postgresql://127.0.0.1/gym4me_test',
  ).pathname;
  if (databaseName === '/gym4me_test' && (await uiFixtureIsRunning())) {
    console.error(
      'UI fixture is listening on 7088. Use a dedicated TEST_DATABASE_URL or stop it before running destructive gym4me_test suites.',
    );
    process.exitCode = 1;
  }
}
