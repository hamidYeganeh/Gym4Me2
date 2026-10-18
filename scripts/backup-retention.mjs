/** Policy is operator supplied. This module never executes deletion. */
export function retentionCommands(config, apply = false) {
  const positive = (value, name, maximum) => {
    if (
      typeof value !== "string" ||
      !/^[1-9][0-9]*$/.test(value) ||
      Number(value) > maximum
    )
      throw new Error(
        `Explicit ${name} is required within its supported range.`,
      );
    return Number(value);
  };
  const days = positive(
    config.BACKUP_RETENTION_DAYS,
    "BACKUP_RETENTION_DAYS",
    3650,
  );
  const last = positive(
    config.BACKUP_RETENTION_LAST,
    "BACKUP_RETENTION_LAST",
    10000,
  );
  const forget = [
    "forget",
    "--host",
    "gym4me-staging",
    "--tag",
    "snapshot",
    // Capture directories are unique. Grouping by their paths would retain every snapshot forever.
    "--group-by",
    "host,tags",
    "--keep-within",
    `${days}d`,
    "--keep-last",
    String(last),
  ];
  return apply
    ? [["check", "--read-data"], forget, ["prune"], ["check", "--read-data"]]
    : [[...forget, "--dry-run"]];
}

/** Only counts enter operator logs; snapshot paths and repository credentials do not. */
export function retentionSummary(output) {
  const groups = JSON.parse(output);
  if (!Array.isArray(groups)) throw new Error("Invalid retention preview.");
  let snapshotsKept = 0,
    snapshotsSelectedForRemoval = 0;
  for (const group of groups) {
    if (!group || typeof group !== "object" || Array.isArray(group))
      throw new Error("Invalid retention preview.");
    for (const name of ["keep", "remove"]) {
      const items = group[name] ?? [];
      if (
        !Array.isArray(items) ||
        items.some(
          (item) =>
            !item ||
            typeof item.id !== "string" ||
            !/^[a-f0-9]{64}$/.test(item.id),
        )
      )
        throw new Error("Invalid retention preview.");
      if (name === "keep") snapshotsKept += items.length;
      else snapshotsSelectedForRemoval += items.length;
    }
  }
  return { snapshotsKept, snapshotsSelectedForRemoval };
}
