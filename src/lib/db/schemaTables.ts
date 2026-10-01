// Content tables in child-before-parent order so a plain DELETE/TRUNCATE
// sequence never trips a foreign key (roles are reference data and are
// intentionally never wiped by reset/seed).
export const CONTENT_TABLES_CHILD_FIRST = [
  "activity_log",
  "events",
  "tasks",
  "team_members",
  "teams",
  "applications",
  "project_competencies",
  "projects",
  "user_competencies",
  "competencies",
  "users",
  "shifts",
] as const;
