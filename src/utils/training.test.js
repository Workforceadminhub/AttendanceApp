import { describe, expect, it } from "vitest";
import {
  PROGRESSION_STATE,
  completionFor,
  daysServed,
  durationFromDates,
  isEligibleForNextLevel,
  isTrainingFull,
  nextSessionDate,
  resolveProgressionStates,
  successfulNominationRecipients,
  trainingStatus,
  unwrapTrainingDetail,
} from "./training";
import { buildPathwayChain } from "../pages/hub/trainings/TrainingClassification";

const SESSIONS = [
  { id: "s1", session_date: "2026-08-04T00:00:00.000Z" },
  { id: "s2", session_date: "2026-08-11T00:00:00.000Z" },
  { id: "s3", session_date: "2026-08-18T00:00:00.000Z" },
];

describe("unwrapTrainingDetail", () => {
  it("reads the record out of the nested detail envelope", () => {
    const response = {
      data: {
        training: { id: "t1", name: "BLC" },
        participation: [{ worker_id: 1 }],
      },
    };
    const detail = unwrapTrainingDetail(response);
    expect(detail.training.name).toBe("BLC");
    expect(detail.participation).toHaveLength(1);
  });

  it("tolerates a flat training payload", () => {
    expect(unwrapTrainingDetail({ data: { id: "t1", name: "BLC" } }).training.name).toBe("BLC");
  });
});

describe("completionFor", () => {
  it("marks complete only when present for every session", () => {
    const participation = SESSIONS.map((s) => ({
      worker_id: 7,
      session_date: s.session_date,
      status: "present",
    }));
    const result = completionFor(7, SESSIONS, participation);
    expect(result.percent).toBe(100);
    expect(result.complete).toBe(true);
  });

  it("does not complete a worker who missed a day", () => {
    const participation = [
      { worker_id: 7, session_date: SESSIONS[0].session_date, status: "present" },
      { worker_id: 7, session_date: SESSIONS[1].session_date, status: "absent" },
      { worker_id: 7, session_date: SESSIONS[2].session_date, status: "present" },
    ];
    const result = completionFor(7, SESSIONS, participation);
    expect(result.present).toBe(2);
    expect(result.complete).toBe(false);
    expect(result.percent).toBe(67);
  });

  it("treats an unmarked session as incomplete rather than absent-free", () => {
    const participation = [
      { worker_id: 7, session_date: SESSIONS[0].session_date, status: "present" },
    ];
    const result = completionFor(7, SESSIONS, participation);
    expect(result.marked).toBe(1);
    expect(result.complete).toBe(false);
  });

  it("ignores other workers' records", () => {
    const participation = SESSIONS.map((s) => ({
      worker_id: 99,
      session_date: s.session_date,
      status: "present",
    }));
    expect(completionFor(7, SESSIONS, participation).present).toBe(0);
  });

  it("does not divide by zero when a training has no sessions", () => {
    expect(completionFor(7, [], [])).toMatchObject({ percent: 0, complete: false });
  });
});

describe("trainingStatus", () => {
  const now = new Date("2026-08-21T00:00:00.000Z");

  it("prefers the status the API supplies", () => {
    expect(trainingStatus({ status: "ongoing" }, { now })).toBe("ongoing");
  });

  it("derives upcoming / ongoing / completed from the date range", () => {
    expect(trainingStatus({ start_date: "2026-09-01", end_date: "2026-09-05" }, { now })).toBe("upcoming");
    expect(trainingStatus({ start_date: "2026-08-01", end_date: "2026-08-30" }, { now })).toBe("ongoing");
    expect(trainingStatus({ start_date: "2026-06-01", end_date: "2026-06-30" }, { now })).toBe("completed");
  });
});

describe("training scheduling helpers", () => {
  it("derives an inclusive duration from the start and end dates", () => {
    expect(durationFromDates("2026-08-01", "2026-08-01")).toBe("1 day");
    expect(durationFromDates("2026-08-01", "2026-08-03")).toBe("3 days");
    expect(durationFromDates("2026-08-03", "2026-08-01")).toBe("");
  });

  it("blocks registration once capacity has been reached", () => {
    expect(isTrainingFull({ capacity: 2, number_of_enrollees: 2 })).toBe(true);
    expect(isTrainingFull({ capacity: 2 }, [{ id: 1 }])).toBe(false);
    expect(isTrainingFull({ capacity: 0, number_of_enrollees: 99 })).toBe(false);
  });
});

describe("nextSessionDate", () => {
  it("returns the first session on or after today, not the first in the array", () => {
    const unsorted = [
      { session_date: "2026-08-18" },
      { session_date: "2026-08-04" },
      { session_date: "2026-08-11" },
    ];
    expect(nextSessionDate(unsorted, { from: new Date("2026-08-05T00:00:00.000Z") })).toBe("2026-08-11");
  });

  it("returns null once every session has passed", () => {
    expect(nextSessionDate(SESSIONS, { from: new Date("2026-09-01T00:00:00.000Z") })).toBeNull();
  });
});

describe("progression eligibility", () => {
  it("requires both the service period and the participation threshold", () => {
    expect(isEligibleForNextLevel({ served_days: 180, required_duration_days: 180, participation_rate: 90 })).toBe(true);
    expect(isEligibleForNextLevel({ served_days: 100, required_duration_days: 180, participation_rate: 90 })).toBe(false);
    expect(isEligibleForNextLevel({ served_days: 180, required_duration_days: 180, participation_rate: 70 })).toBe(false);
  });

  it("counts days served from the assignment start date", () => {
    expect(daysServed("2026-08-01", { to: new Date("2026-08-21T00:00:00.000Z") })).toBe(20);
    expect(daysServed("2026-09-01", { to: new Date("2026-08-21T00:00:00.000Z") })).toBe(0);
  });

  it("exposes the five progression states", () => {
    expect(Object.values(PROGRESSION_STATE)).toEqual([
      "not_started",
      "in_progress",
      "completed_serving",
      "eligible",
      "complete",
    ]);
  });
});

describe("resolveProgressionStates", () => {
  const chain = [
    { id: "foundation", name: "Foundation" },
    { id: "advanced", name: "Advanced" },
  ];
  const completedFoundation = [
    { training: { id: "foundation" }, status: "completed", completed_at: "2026-08-01" },
  ];

  it("does not treat viewing the current level as enrollment", () => {
    expect(resolveProgressionStates({
      chain,
      currentTrainingId: "advanced",
      workerId: 7,
      workerTrainings: completedFoundation,
      isCurrentEnrolled: false,
    })).toEqual([
      PROGRESSION_STATE.COMPLETED_SERVING,
      PROGRESSION_STATE.NOT_STARTED,
    ]);
  });

  it("marks the current level in progress only after enrollment", () => {
    expect(resolveProgressionStates({
      chain,
      currentTrainingId: "advanced",
      workerId: 7,
      workerTrainings: completedFoundation,
      isCurrentEnrolled: true,
    })[1]).toBe(PROGRESSION_STATE.IN_PROGRESS);
  });
});

describe("successfulNominationRecipients", () => {
  const selected = [
    { id: 1, email: "one@example.com" },
    { id: 2, email: "two@example.com" },
  ];

  it("returns every address when the nomination batch fully succeeds", () => {
    expect(successfulNominationRecipients(selected, [], 0)).toEqual([
      "one@example.com",
      "two@example.com",
    ]);
  });

  it("emails only identifiable successful workers after a partial result", () => {
    const results = [
      { worker_id: 1, success: true },
      { worker_id: 2, success: false, error: "Already nominated" },
    ];
    expect(successfulNominationRecipients(selected, results, 1)).toEqual(["one@example.com"]);
  });

  it("fails closed when partial successes cannot be mapped to workers", () => {
    expect(successfulNominationRecipients(selected, [{ success: true }, { success: false }], 1)).toEqual([]);
  });
});

describe("buildPathwayChain", () => {
  const PATH = "p1";
  const blc = { id: "t1", name: "BLC", template_slug: "blc", progression_path_id: PATH, start_date: "2026-01-01" };
  const alc = { id: "t2", name: "ALC", template_slug: "alc", progression_path_id: PATH, prerequisite_template_slug: "blc", start_date: "2026-03-01" };
  const ldp = { id: "t3", name: "LDP", template_slug: "ldp", progression_path_id: PATH, prerequisite_template_slug: "alc", start_date: "2026-06-01" };

  it("orders the chain by prerequisite links, not array order", () => {
    const chain = buildPathwayChain([ldp, blc, alc], { pathId: PATH });
    expect(chain.map((t) => t.name)).toEqual(["BLC", "ALC", "LDP"]);
  });

  it("excludes trainings on a different pathway", () => {
    const other = { id: "t9", name: "Other", template_slug: "other", progression_path_id: "p2" };
    const chain = buildPathwayChain([blc, alc, other], { pathId: PATH });
    expect(chain.map((t) => t.name)).toEqual(["BLC", "ALC"]);
  });

  it("places an unsaved draft into the chain", () => {
    const draft = { id: undefined, name: "New Level", progression_path_id: PATH, prerequisite_template_slug: "alc" };
    const chain = buildPathwayChain([blc, alc], { pathId: PATH, draft });
    expect(chain.map((t) => t.name)).toEqual(["BLC", "ALC", "New Level"]);
  });

  it("still lists orphans that no prerequisite link reaches", () => {
    const orphan = { id: "t8", name: "Orphan", template_slug: "orphan", progression_path_id: PATH, prerequisite_template_slug: "missing" };
    const chain = buildPathwayChain([blc, orphan], { pathId: PATH });
    expect(chain.map((t) => t.name)).toContain("Orphan");
  });

  it("terminates on a circular prerequisite instead of looping forever", () => {
    const a = { id: "a", name: "A", template_slug: "a", progression_path_id: PATH, prerequisite_template_slug: "b" };
    const b = { id: "b", name: "B", template_slug: "b", progression_path_id: PATH, prerequisite_template_slug: "a" };
    const chain = buildPathwayChain([a, b], { pathId: PATH });
    expect(chain).toHaveLength(2);
  });

  it("returns nothing when no pathway is selected", () => {
    expect(buildPathwayChain([blc, alc], { pathId: "" })).toEqual([]);
  });
});
