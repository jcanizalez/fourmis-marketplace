import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// --- Database setup ---

const dbDir = process.env.TIMETRACKER_DB_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "timetracker.db");
export const db: DatabaseType = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --- Schema ---

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    client TEXT,
    description TEXT,
    hourly_rate REAL,
    currency TEXT DEFAULT 'USD',
    color TEXT,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_minutes REAL,
    billable INTEGER DEFAULT 1,
    tags TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS active_timer (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    project_id INTEGER NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,
    tags TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
  CREATE INDEX IF NOT EXISTS idx_entries_start ON time_entries(start_time);
  CREATE INDEX IF NOT EXISTS idx_entries_end ON time_entries(end_time);
  CREATE INDEX IF NOT EXISTS idx_projects_archived ON projects(archived);
`);

// --- Types ---

export interface Project {
  id: number;
  name: string;
  client: string | null;
  description: string | null;
  hourly_rate: number | null;
  currency: string;
  color: string | null;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: number;
  project_id: number;
  description: string | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  billable: number;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActiveTimer {
  id: number;
  project_id: number;
  description: string | null;
  start_time: string;
  tags: string | null;
}

export interface TimesheetEntry {
  date: string;
  project_name: string;
  client: string | null;
  description: string | null;
  duration_minutes: number;
  billable: number;
  hourly_rate: number | null;
  amount: number | null;
}

export interface ProjectSummary {
  project_id: number;
  project_name: string;
  client: string | null;
  total_minutes: number;
  billable_minutes: number;
  hourly_rate: number | null;
  currency: string;
  total_amount: number | null;
  entry_count: number;
}

// --- Project operations ---

export function createProject(data: {
  name: string;
  client?: string;
  description?: string;
  hourly_rate?: number;
  currency?: string;
  color?: string;
}): Project {
  const stmt = db.prepare(`
    INSERT INTO projects (name, client, description, hourly_rate, currency, color)
    VALUES (@name, @client, @description, @hourly_rate, @currency, @color)
  `);
  const result = stmt.run({
    name: data.name,
    client: data.client || null,
    description: data.description || null,
    hourly_rate: data.hourly_rate || null,
    currency: data.currency || "USD",
    color: data.color || null,
  });
  return getProject(result.lastInsertRowid as number)!;
}

export function getProject(id: number): Project | undefined {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Project
    | undefined;
}

export function listProjects(opts?: {
  includeArchived?: boolean;
}): Project[] {
  if (opts?.includeArchived) {
    return db.prepare("SELECT * FROM projects ORDER BY name").all() as Project[];
  }
  return db
    .prepare("SELECT * FROM projects WHERE archived = 0 ORDER BY name")
    .all() as Project[];
}

export function searchProjects(query: string): Project[] {
  const like = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM projects WHERE archived = 0 AND (
        name LIKE ? OR client LIKE ? OR description LIKE ?
      ) ORDER BY name`
    )
    .all(like, like, like) as Project[];
}

export function archiveProject(id: number): void {
  db.prepare(
    "UPDATE projects SET archived = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(id);
}

export function updateProject(
  id: number,
  data: {
    name?: string;
    client?: string;
    description?: string;
    hourly_rate?: number;
    currency?: string;
    color?: string;
  }
): Project | undefined {
  const project = getProject(id);
  if (!project) return undefined;

  db.prepare(
    `UPDATE projects SET
      name = @name,
      client = @client,
      description = @description,
      hourly_rate = @hourly_rate,
      currency = @currency,
      color = @color,
      updated_at = datetime('now')
    WHERE id = @id`
  ).run({
    id,
    name: data.name ?? project.name,
    client: data.client !== undefined ? data.client : project.client,
    description:
      data.description !== undefined ? data.description : project.description,
    hourly_rate:
      data.hourly_rate !== undefined ? data.hourly_rate : project.hourly_rate,
    currency: data.currency ?? project.currency,
    color: data.color !== undefined ? data.color : project.color,
  });

  return getProject(id);
}

// --- Timer operations ---

export function startTimer(data: {
  project_id: number;
  description?: string;
  tags?: string;
}): ActiveTimer {
  // Check project exists
  const project = getProject(data.project_id);
  if (!project) {
    throw new Error(`Project ${data.project_id} not found`);
  }

  // Check no timer already running
  const existing = getActiveTimer();
  if (existing) {
    throw new Error(
      `Timer already running on project "${project.name}" since ${existing.start_time}. Stop it first.`
    );
  }

  db.prepare(
    `INSERT OR REPLACE INTO active_timer (id, project_id, description, start_time, tags)
     VALUES (1, @project_id, @description, datetime('now'), @tags)`
  ).run({
    project_id: data.project_id,
    description: data.description || null,
    tags: data.tags || null,
  });

  return getActiveTimer()!;
}

export function getActiveTimer(): ActiveTimer | undefined {
  return db.prepare("SELECT * FROM active_timer WHERE id = 1").get() as
    | ActiveTimer
    | undefined;
}

export function stopTimer(): TimeEntry {
  const timer = getActiveTimer();
  if (!timer) {
    throw new Error("No timer is currently running");
  }

  const endTime = new Date().toISOString().replace("T", " ").replace("Z", "");

  // Calculate duration in minutes
  const start = new Date(timer.start_time + "Z");
  const end = new Date();
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  const result = db.prepare(
    `INSERT INTO time_entries (project_id, description, start_time, end_time, duration_minutes, tags)
     VALUES (@project_id, @description, @start_time, @end_time, @duration_minutes, @tags)`
  ).run({
    project_id: timer.project_id,
    description: timer.description,
    start_time: timer.start_time,
    end_time: endTime,
    duration_minutes: durationMinutes,
    tags: timer.tags,
  });

  // Clear the active timer
  db.prepare("DELETE FROM active_timer WHERE id = 1").run();

  return getTimeEntry(result.lastInsertRowid as number)!;
}

// --- Time entry operations ---

export function getTimeEntry(id: number): TimeEntry | undefined {
  return db.prepare("SELECT * FROM time_entries WHERE id = ?").get(id) as
    | TimeEntry
    | undefined;
}

export function addTimeEntry(data: {
  project_id: number;
  description?: string;
  start_time: string;
  end_time: string;
  billable?: boolean;
  tags?: string;
}): TimeEntry {
  const project = getProject(data.project_id);
  if (!project) {
    throw new Error(`Project ${data.project_id} not found`);
  }

  const start = new Date(data.start_time);
  const end = new Date(data.end_time);
  if (end <= start) {
    throw new Error("End time must be after start time");
  }
  const durationMinutes = Math.round(
    (end.getTime() - start.getTime()) / 60000
  );

  const result = db.prepare(
    `INSERT INTO time_entries (project_id, description, start_time, end_time, duration_minutes, billable, tags)
     VALUES (@project_id, @description, @start_time, @end_time, @duration_minutes, @billable, @tags)`
  ).run({
    project_id: data.project_id,
    description: data.description || null,
    start_time: data.start_time,
    end_time: data.end_time,
    duration_minutes: durationMinutes,
    billable: data.billable === false ? 0 : 1,
    tags: data.tags || null,
  });

  return getTimeEntry(result.lastInsertRowid as number)!;
}

export function listTimeEntries(opts?: {
  project_id?: number;
  from?: string;
  to?: string;
  billable?: boolean;
  limit?: number;
}): (TimeEntry & { project_name: string; client: string | null })[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.project_id) {
    conditions.push("te.project_id = @project_id");
    params.project_id = opts.project_id;
  }
  if (opts?.from) {
    conditions.push("te.start_time >= @from");
    params.from = opts.from;
  }
  if (opts?.to) {
    conditions.push("te.start_time <= @to");
    params.to = opts.to;
  }
  if (opts?.billable !== undefined) {
    conditions.push("te.billable = @billable");
    params.billable = opts.billable ? 1 : 0;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ? `LIMIT ${opts.limit}` : "LIMIT 100";

  return db
    .prepare(
      `SELECT te.*, p.name as project_name, p.client
       FROM time_entries te
       JOIN projects p ON te.project_id = p.id
       ${where}
       ORDER BY te.start_time DESC
       ${limit}`
    )
    .all(params) as (TimeEntry & { project_name: string; client: string | null })[];
}

export function deleteTimeEntry(id: number): boolean {
  const result = db.prepare("DELETE FROM time_entries WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateTimeEntry(
  id: number,
  data: {
    description?: string;
    billable?: boolean;
    tags?: string;
  }
): TimeEntry | undefined {
  const entry = getTimeEntry(id);
  if (!entry) return undefined;

  db.prepare(
    `UPDATE time_entries SET
      description = @description,
      billable = @billable,
      tags = @tags,
      updated_at = datetime('now')
    WHERE id = @id`
  ).run({
    id,
    description:
      data.description !== undefined ? data.description : entry.description,
    billable:
      data.billable !== undefined ? (data.billable ? 1 : 0) : entry.billable,
    tags: data.tags !== undefined ? data.tags : entry.tags,
  });

  return getTimeEntry(id);
}

// --- Reports ---

export function getTimesheet(opts: {
  from: string;
  to: string;
  project_id?: number;
  billable_only?: boolean;
}): TimesheetEntry[] {
  const conditions = ["te.start_time >= @from", "te.start_time <= @to"];
  const params: Record<string, unknown> = { from: opts.from, to: opts.to };

  if (opts.project_id) {
    conditions.push("te.project_id = @project_id");
    params.project_id = opts.project_id;
  }
  if (opts.billable_only) {
    conditions.push("te.billable = 1");
  }

  return db
    .prepare(
      `SELECT
        date(te.start_time) as date,
        p.name as project_name,
        p.client,
        te.description,
        te.duration_minutes,
        te.billable,
        p.hourly_rate,
        CASE WHEN te.billable = 1 AND p.hourly_rate IS NOT NULL
          THEN ROUND(te.duration_minutes / 60.0 * p.hourly_rate, 2)
          ELSE NULL
        END as amount
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY te.start_time ASC`
    )
    .all(params) as TimesheetEntry[];
}

export function getProjectSummary(opts: {
  from?: string;
  to?: string;
}): ProjectSummary[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts.from) {
    conditions.push("te.start_time >= @from");
    params.from = opts.from;
  }
  if (opts.to) {
    conditions.push("te.start_time <= @to");
    params.to = opts.to;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return db
    .prepare(
      `SELECT
        p.id as project_id,
        p.name as project_name,
        p.client,
        COALESCE(SUM(te.duration_minutes), 0) as total_minutes,
        COALESCE(SUM(CASE WHEN te.billable = 1 THEN te.duration_minutes ELSE 0 END), 0) as billable_minutes,
        p.hourly_rate,
        p.currency,
        CASE WHEN p.hourly_rate IS NOT NULL
          THEN ROUND(SUM(CASE WHEN te.billable = 1 THEN te.duration_minutes ELSE 0 END) / 60.0 * p.hourly_rate, 2)
          ELSE NULL
        END as total_amount,
        COUNT(te.id) as entry_count
      FROM projects p
      LEFT JOIN time_entries te ON p.id = te.project_id ${where ? "AND " + conditions.join(" AND ") : ""}
      WHERE p.archived = 0
      GROUP BY p.id
      ORDER BY total_minutes DESC`
    )
    .all(params) as ProjectSummary[];
}

export function getWeeklySummary(opts?: {
  weeks_back?: number;
}): {
  week_start: string;
  total_minutes: number;
  billable_minutes: number;
  project_count: number;
  entry_count: number;
}[] {
  const weeksBack = opts?.weeks_back || 4;

  return db
    .prepare(
      `SELECT
        date(te.start_time, 'weekday 0', '-6 days') as week_start,
        SUM(te.duration_minutes) as total_minutes,
        SUM(CASE WHEN te.billable = 1 THEN te.duration_minutes ELSE 0 END) as billable_minutes,
        COUNT(DISTINCT te.project_id) as project_count,
        COUNT(te.id) as entry_count
      FROM time_entries te
      WHERE te.start_time >= date('now', '-' || @weeks_back || ' weeks')
      GROUP BY week_start
      ORDER BY week_start DESC`
    )
    .all({ weeks_back: weeksBack * 7 }) as {
    week_start: string;
    total_minutes: number;
    billable_minutes: number;
    project_count: number;
    entry_count: number;
  }[];
}
