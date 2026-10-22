import { RequestDueWork } from './request-due-work';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('request-triggered due work', () => {
  it('coalesces concurrent reads and keeps fresh reads off the maintenance path', async () => {
    let now = 1000;
    const pending = deferred();
    const drain = jest.fn().mockReturnValueOnce(pending.promise);
    const gate = new RequestDueWork(drain, () => now);
    const first = gate.run('read');
    const second = gate.run('read');
    await Promise.resolve();
    expect(drain).toHaveBeenCalledTimes(1);
    pending.resolve();
    await Promise.all([first, second]);
    now = 5999;
    await gate.run('read');
    expect(drain).toHaveBeenCalledTimes(1);
    now = 6000;
    await gate.run('read');
    expect(drain).toHaveBeenCalledTimes(2);
  });

  it('runs commands despite a fresh read window', async () => {
    const drain = jest.fn().mockResolvedValue(undefined);
    const gate = new RequestDueWork(drain, () => 1000);
    await gate.run('read');
    await gate.run('command');
    expect(drain).toHaveBeenCalledTimes(2);
  });

  it('runs a following pass for commands committed during an existing snapshot', async () => {
    const pending = deferred();
    const drain = jest.fn().mockReturnValueOnce(pending.promise);
    const gate = new RequestDueWork(drain);
    const read = gate.run('read');
    await Promise.resolve();
    const command = gate.run('command');
    const otherCommand = gate.run('command');
    pending.resolve();
    await Promise.all([read, command, otherCommand]);
    expect(drain).toHaveBeenCalledTimes(2);
  });

  it('does not mark failed work fresh or let a failed read prevent command cleanup', async () => {
    const drain = jest
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValue(undefined);
    const gate = new RequestDueWork(drain);
    const read = gate.run('read');
    const command = gate.run('command');
    await expect(read).rejects.toThrow('transient');
    await command;
    expect(drain).toHaveBeenCalledTimes(2);
  });

  it('keeps maintenance state isolated between application instances', async () => {
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);
    await new RequestDueWork(first).run('read');
    await new RequestDueWork(second).run('read');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
});
