/**
 * One place for TanStack Query keys, so a mutation invalidates exactly the
 * keys its queries were registered under. Calling a factory with no argument
 * returns the prefix that matches every variant of that key.
 */
const key = (name) => (...parts) => [name, ...parts.filter((part) => part !== undefined)];

export const queryKeys = {
  rbac: key("rbac"),
  departments: key("departments"),
  workersList: key("workersList"),
  churchAdminWorkers: key("churchAdminWorkers"),
  pendingWorkers: key("pendingWorkers"),
  departmentWorkers: key("departmentWorkers"),
  sundayAttendance: key("sundayAttendance"),
  attendanceHistory: key("attendanceHistory"),
  auditLogs: key("auditLogs"),
  hub: {
    trainings: key("hub-trainings"),
    training: key("hub-training"),
    trainingSessions: key("hub-training-sessions"),
    trainingEnrollees: key("hub-training-enrollees"),
    trainingNominations: key("hub-training-nominations"),
    trainingRequests: key("hub-training-requests"),
    trainingCertificates: key("hub-training-certificates"),
    trainingCurriculum: key("hub-training-curriculum"),
    trainingDeptAssignments: key("hub-training-dept-assignments"),
    trainingPrograms: key("hub-training-programs"),
    courses: key("hub-courses"),
    course: key("hub-course"),
    courseCurriculum: key("hub-course-curriculum"),
    courseEnrollments: key("hub-course-enrollments"),
    cohorts: key("hub-cohorts"),
    progressionPaths: key("hub-progression-paths"),
    certificateTemplates: key("hub-certificate-templates"),
    myNominations: key("hub-my-nominations"),
    workerTrainings: key("hub-worker-trainings"),
    workerPriorCompletions: key("hub-worker-prior-completions"),
    workerTrainingMetrics: key("hub-worker-training-metrics"),
    workerCertificates: key("hub-worker-certificates"),
    workersDirectory: key("hub-workers-directory"),
  },
};
