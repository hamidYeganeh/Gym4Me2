import type { Prescription, SetLog } from "@repo/api/profile";

/** Replacement applies to remaining sets, never to already recorded performance. */
export function replaceRemainingSets(
  logs: SetLog[],
  prescription: Prescription,
  exerciseId: string,
): SetLog[] {
  const next = logs.map((log) =>
    log.prescriptionId === prescription.id && !log.done
      ? { ...log, exerciseId }
      : log,
  );
  for (let set = 1; set <= prescription.sets; set++) {
    if (
      !next.some(
        (log) => log.prescriptionId === prescription.id && log.set === set,
      )
    )
      next.push({
        prescriptionId: prescription.id,
        exerciseId,
        set,
        reps: null,
        seconds: null,
        load: null,
        rpe: null,
        done: false,
      });
  }
  return next;
}
