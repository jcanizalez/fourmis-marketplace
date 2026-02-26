/**
 * Database layer for the local CRM.
 *
 * Uses better-sqlite3 for synchronous SQLite access.
 * Auto-creates the database and schema on first run.
 * All data stored locally — zero cloud dependencies.
 */

import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─── Database Setup ───────────────────────────────────────────────

const dbDir = process.env.CRM_DB_DIR || path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "crm.db");

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db: DatabaseType = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ───────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    role TEXT,
    tags TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    stage TEXT DEFAULT 'lead',
    notes TEXT DEFAULT '',
    expected_close TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    deal_id INTEGER,
    type TEXT NOT NULL DEFAULT 'note',
    summary TEXT NOT NULL,
    details TEXT DEFAULT '',
    occurred_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    deal_id INTEGER,
    description TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
  CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
  CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
  CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
  CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
  CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON follow_ups(due_date);
  CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
`);

// ─── Types ────────────────────────────────────────────────────────

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  tags: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: number;
  contact_id: number;
  title: string;
  amount: number;
  currency: string;
  stage: string;
  notes: string;
  expected_close: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
}

export interface Interaction {
  id: number;
  contact_id: number;
  deal_id: number | null;
  type: string;
  summary: string;
  details: string;
  occurred_at: string;
  created_at: string;
  contact_name?: string;
}

export interface FollowUp {
  id: number;
  contact_id: number;
  deal_id: number | null;
  description: string;
  due_date: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  contact_name?: string;
  deal_title?: string;
}

// ─── Contact Operations ───────────────────────────────────────────

export function createContact(data: {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  tags?: string;
  notes?: string;
}): Contact {
  const stmt = db.prepare(`
    INSERT INTO contacts (name, email, phone, company, role, tags, notes)
    VALUES (@name, @email, @phone, @company, @role, @tags, @notes)
  `);
  const result = stmt.run({
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    company: data.company || null,
    role: data.role || null,
    tags: data.tags || "",
    notes: data.notes || "",
  });
  return getContactById(Number(result.lastInsertRowid))!;
}

export function getContactById(id: number): Contact | undefined {
  const stmt = db.prepare("SELECT * FROM contacts WHERE id = ?");
  return stmt.get(id) as Contact | undefined;
}

export function searchContacts(query: string, limit = 20): Contact[] {
  const stmt = db.prepare(`
    SELECT * FROM contacts
    WHERE name LIKE @q OR email LIKE @q OR company LIKE @q OR tags LIKE @q OR notes LIKE @q
    ORDER BY updated_at DESC
    LIMIT @limit
  `);
  return stmt.all({ q: `%${query}%`, limit }) as Contact[];
}

export function listContacts(opts: {
  company?: string;
  tag?: string;
  limit?: number;
  offset?: number;
}): Contact[] {
  let sql = "SELECT * FROM contacts WHERE 1=1";
  const params: Record<string, unknown> = {};

  if (opts.company) {
    sql += " AND company LIKE @company";
    params.company = `%${opts.company}%`;
  }
  if (opts.tag) {
    sql += " AND tags LIKE @tag";
    params.tag = `%${opts.tag}%`;
  }
  sql += " ORDER BY updated_at DESC LIMIT @limit OFFSET @offset";
  params.limit = opts.limit || 20;
  params.offset = opts.offset || 0;

  const stmt = db.prepare(sql);
  return stmt.all(params) as Contact[];
}

export function updateContact(
  id: number,
  data: Partial<Omit<Contact, "id" | "created_at" | "updated_at">>
): Contact | undefined {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = @${key}`);
      params[key] = value;
    }
  }
  if (fields.length === 0) return getContactById(id);

  fields.push("updated_at = datetime('now')");
  const sql = `UPDATE contacts SET ${fields.join(", ")} WHERE id = @id`;
  db.prepare(sql).run(params);
  return getContactById(id);
}

export function deleteContact(id: number): boolean {
  const result = db.prepare("DELETE FROM contacts WHERE id = ?").run(id);
  return result.changes > 0;
}

// ─── Deal Operations ──────────────────────────────────────────────

const DEAL_STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export function createDeal(data: {
  contact_id: number;
  title: string;
  amount?: number;
  currency?: string;
  stage?: DealStage;
  notes?: string;
  expected_close?: string;
}): Deal {
  const stmt = db.prepare(`
    INSERT INTO deals (contact_id, title, amount, currency, stage, notes, expected_close)
    VALUES (@contact_id, @title, @amount, @currency, @stage, @notes, @expected_close)
  `);
  const result = stmt.run({
    contact_id: data.contact_id,
    title: data.title,
    amount: data.amount || 0,
    currency: data.currency || "USD",
    stage: data.stage || "lead",
    notes: data.notes || "",
    expected_close: data.expected_close || null,
  });
  return getDealById(Number(result.lastInsertRowid))!;
}

export function getDealById(id: number): Deal | undefined {
  const stmt = db.prepare(`
    SELECT d.*, c.name as contact_name
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE d.id = ?
  `);
  return stmt.get(id) as Deal | undefined;
}

export function moveDeal(id: number, stage: DealStage): Deal | undefined {
  db.prepare(
    "UPDATE deals SET stage = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(stage, id);
  return getDealById(id);
}

export function listDeals(opts: {
  stage?: DealStage;
  contact_id?: number;
  limit?: number;
}): Deal[] {
  let sql = `
    SELECT d.*, c.name as contact_name
    FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE 1=1
  `;
  const params: Record<string, unknown> = {};

  if (opts.stage) {
    sql += " AND d.stage = @stage";
    params.stage = opts.stage;
  }
  if (opts.contact_id) {
    sql += " AND d.contact_id = @contact_id";
    params.contact_id = opts.contact_id;
  }
  sql += " ORDER BY d.updated_at DESC LIMIT @limit";
  params.limit = opts.limit || 50;

  return db.prepare(sql).all(params) as Deal[];
}

export function deleteDeal(id: number): boolean {
  const result = db.prepare("DELETE FROM deals WHERE id = ?").run(id);
  return result.changes > 0;
}

// ─── Interaction Operations ───────────────────────────────────────

const INTERACTION_TYPES = [
  "call",
  "email",
  "meeting",
  "note",
  "message",
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export function logInteraction(data: {
  contact_id: number;
  deal_id?: number;
  type?: InteractionType;
  summary: string;
  details?: string;
  occurred_at?: string;
}): Interaction {
  const stmt = db.prepare(`
    INSERT INTO interactions (contact_id, deal_id, type, summary, details, occurred_at)
    VALUES (@contact_id, @deal_id, @type, @summary, @details, @occurred_at)
  `);
  const result = stmt.run({
    contact_id: data.contact_id,
    deal_id: data.deal_id || null,
    type: data.type || "note",
    summary: data.summary,
    details: data.details || "",
    occurred_at: data.occurred_at || new Date().toISOString(),
  });

  // Also bump contact updated_at
  db.prepare(
    "UPDATE contacts SET updated_at = datetime('now') WHERE id = ?"
  ).run(data.contact_id);

  return getInteractionById(Number(result.lastInsertRowid))!;
}

function getInteractionById(id: number): Interaction | undefined {
  const stmt = db.prepare(`
    SELECT i.*, c.name as contact_name
    FROM interactions i
    JOIN contacts c ON i.contact_id = c.id
    WHERE i.id = ?
  `);
  return stmt.get(id) as Interaction | undefined;
}

export function listInteractions(opts: {
  contact_id?: number;
  deal_id?: number;
  type?: InteractionType;
  limit?: number;
}): Interaction[] {
  let sql = `
    SELECT i.*, c.name as contact_name
    FROM interactions i
    JOIN contacts c ON i.contact_id = c.id
    WHERE 1=1
  `;
  const params: Record<string, unknown> = {};

  if (opts.contact_id) {
    sql += " AND i.contact_id = @contact_id";
    params.contact_id = opts.contact_id;
  }
  if (opts.deal_id) {
    sql += " AND i.deal_id = @deal_id";
    params.deal_id = opts.deal_id;
  }
  if (opts.type) {
    sql += " AND i.type = @type";
    params.type = opts.type;
  }
  sql += " ORDER BY i.occurred_at DESC LIMIT @limit";
  params.limit = opts.limit || 25;

  return db.prepare(sql).all(params) as Interaction[];
}

// ─── Follow-Up Operations ─────────────────────────────────────────

export function scheduleFollowUp(data: {
  contact_id: number;
  deal_id?: number;
  description: string;
  due_date: string;
}): FollowUp {
  const stmt = db.prepare(`
    INSERT INTO follow_ups (contact_id, deal_id, description, due_date)
    VALUES (@contact_id, @deal_id, @description, @due_date)
  `);
  const result = stmt.run({
    contact_id: data.contact_id,
    deal_id: data.deal_id || null,
    description: data.description,
    due_date: data.due_date,
  });
  return getFollowUpById(Number(result.lastInsertRowid))!;
}

function getFollowUpById(id: number): FollowUp | undefined {
  const stmt = db.prepare(`
    SELECT f.*, c.name as contact_name, d.title as deal_title
    FROM follow_ups f
    JOIN contacts c ON f.contact_id = c.id
    LEFT JOIN deals d ON f.deal_id = d.id
    WHERE f.id = ?
  `);
  return stmt.get(id) as FollowUp | undefined;
}

export function completeFollowUp(id: number): FollowUp | undefined {
  db.prepare(
    "UPDATE follow_ups SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
  ).run(id);
  return getFollowUpById(id);
}

export function listFollowUps(opts: {
  status?: "pending" | "completed";
  contact_id?: number;
  overdue?: boolean;
  limit?: number;
}): FollowUp[] {
  let sql = `
    SELECT f.*, c.name as contact_name, d.title as deal_title
    FROM follow_ups f
    JOIN contacts c ON f.contact_id = c.id
    LEFT JOIN deals d ON f.deal_id = d.id
    WHERE 1=1
  `;
  const params: Record<string, unknown> = {};

  if (opts.status) {
    sql += " AND f.status = @status";
    params.status = opts.status;
  }
  if (opts.contact_id) {
    sql += " AND f.contact_id = @contact_id";
    params.contact_id = opts.contact_id;
  }
  if (opts.overdue) {
    sql += " AND f.due_date < datetime('now') AND f.status = 'pending'";
  }
  sql += " ORDER BY f.due_date ASC LIMIT @limit";
  params.limit = opts.limit || 25;

  return db.prepare(sql).all(params) as FollowUp[];
}

// ─── Reports ──────────────────────────────────────────────────────

export interface PipelineReport {
  total_deals: number;
  total_value: number;
  stages: { stage: string; count: number; value: number }[];
  recent_wins: Deal[];
  recent_losses: Deal[];
}

export function getPipelineReport(): PipelineReport {
  const stages = db
    .prepare(
      `
    SELECT stage, COUNT(*) as count, COALESCE(SUM(amount), 0) as value
    FROM deals
    GROUP BY stage
    ORDER BY CASE stage
      WHEN 'lead' THEN 1
      WHEN 'qualified' THEN 2
      WHEN 'proposal' THEN 3
      WHEN 'negotiation' THEN 4
      WHEN 'won' THEN 5
      WHEN 'lost' THEN 6
    END
  `
    )
    .all() as { stage: string; count: number; value: number }[];

  const total_deals = stages.reduce((sum, s) => sum + s.count, 0);
  const total_value = stages.reduce((sum, s) => sum + s.value, 0);

  const recent_wins = db
    .prepare(
      `
    SELECT d.*, c.name as contact_name FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE d.stage = 'won'
    ORDER BY d.updated_at DESC LIMIT 5
  `
    )
    .all() as Deal[];

  const recent_losses = db
    .prepare(
      `
    SELECT d.*, c.name as contact_name FROM deals d
    JOIN contacts c ON d.contact_id = c.id
    WHERE d.stage = 'lost'
    ORDER BY d.updated_at DESC LIMIT 5
  `
    )
    .all() as Deal[];

  return { total_deals, total_value, stages, recent_wins, recent_losses };
}

export interface DashboardReport {
  total_contacts: number;
  total_deals: number;
  open_deals_value: number;
  won_deals_value: number;
  pending_follow_ups: number;
  overdue_follow_ups: number;
  recent_interactions: Interaction[];
  upcoming_follow_ups: FollowUp[];
}

export function getDashboard(): DashboardReport {
  const total_contacts = (
    db.prepare("SELECT COUNT(*) as count FROM contacts").get() as {
      count: number;
    }
  ).count;

  const total_deals = (
    db.prepare("SELECT COUNT(*) as count FROM deals").get() as {
      count: number;
    }
  ).count;

  const open_deals_value = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as value FROM deals WHERE stage NOT IN ('won', 'lost')"
      )
      .get() as { value: number }
  ).value;

  const won_deals_value = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as value FROM deals WHERE stage = 'won'"
      )
      .get() as { value: number }
  ).value;

  const pending_follow_ups = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM follow_ups WHERE status = 'pending'"
      )
      .get() as { count: number }
  ).count;

  const overdue_follow_ups = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM follow_ups WHERE status = 'pending' AND due_date < datetime('now')"
      )
      .get() as { count: number }
  ).count;

  const recent_interactions = db
    .prepare(
      `
    SELECT i.*, c.name as contact_name
    FROM interactions i
    JOIN contacts c ON i.contact_id = c.id
    ORDER BY i.occurred_at DESC LIMIT 5
  `
    )
    .all() as Interaction[];

  const upcoming_follow_ups = db
    .prepare(
      `
    SELECT f.*, c.name as contact_name, d.title as deal_title
    FROM follow_ups f
    JOIN contacts c ON f.contact_id = c.id
    LEFT JOIN deals d ON f.deal_id = d.id
    WHERE f.status = 'pending'
    ORDER BY f.due_date ASC LIMIT 5
  `
    )
    .all() as FollowUp[];

  return {
    total_contacts,
    total_deals,
    open_deals_value,
    won_deals_value,
    pending_follow_ups,
    overdue_follow_ups,
    recent_interactions,
    upcoming_follow_ups,
  };
}

// ─── Formatting Helpers ───────────────────────────────────────────

export function formatContact(c: Contact): string {
  let out = `### ${c.name}`;
  if (c.company) out += ` (${c.company})`;
  out += `\n**ID**: ${c.id}`;
  if (c.role) out += ` | **Role**: ${c.role}`;
  if (c.email) out += `\n**Email**: ${c.email}`;
  if (c.phone) out += ` | **Phone**: ${c.phone}`;
  if (c.tags) out += `\n**Tags**: ${c.tags}`;
  if (c.notes) out += `\n**Notes**: ${c.notes}`;
  out += `\n*Created*: ${c.created_at} | *Updated*: ${c.updated_at}`;
  return out;
}

export function formatContactList(contacts: Contact[]): string {
  if (contacts.length === 0) return "No contacts found.";
  return contacts.map(formatContact).join("\n\n---\n\n");
}

export function formatDeal(d: Deal): string {
  const emoji: Record<string, string> = {
    lead: "🔵",
    qualified: "🟡",
    proposal: "🟠",
    negotiation: "🔴",
    won: "✅",
    lost: "❌",
  };
  let out = `### ${emoji[d.stage] || "⚪"} ${d.title}`;
  out += `\n**ID**: ${d.id} | **Stage**: ${d.stage} | **Value**: ${d.currency} ${d.amount.toLocaleString()}`;
  if (d.contact_name) out += `\n**Contact**: ${d.contact_name} (ID: ${d.contact_id})`;
  if (d.expected_close) out += ` | **Expected Close**: ${d.expected_close}`;
  if (d.notes) out += `\n**Notes**: ${d.notes}`;
  out += `\n*Created*: ${d.created_at}`;
  return out;
}

export function formatDealList(deals: Deal[]): string {
  if (deals.length === 0) return "No deals found.";
  return deals.map(formatDeal).join("\n\n---\n\n");
}

export function formatInteraction(i: Interaction): string {
  const emoji: Record<string, string> = {
    call: "📞",
    email: "✉️",
    meeting: "🤝",
    note: "📝",
    message: "💬",
  };
  let out = `${emoji[i.type] || "📋"} **${i.type.toUpperCase()}** — ${i.summary}`;
  out += `\n*Contact*: ${i.contact_name || `ID ${i.contact_id}`} | *When*: ${i.occurred_at}`;
  if (i.details) out += `\n${i.details}`;
  return out;
}

export function formatInteractionList(interactions: Interaction[]): string {
  if (interactions.length === 0) return "No interactions found.";
  return interactions.map(formatInteraction).join("\n\n");
}

export function formatFollowUp(f: FollowUp): string {
  const isOverdue =
    f.status === "pending" && new Date(f.due_date) < new Date();
  const marker = f.status === "completed" ? "✅" : isOverdue ? "⚠️" : "📅";
  let out = `${marker} **${f.description}**`;
  out += `\n**ID**: ${f.id} | **Due**: ${f.due_date} | **Status**: ${f.status}`;
  out += `\n*Contact*: ${f.contact_name || `ID ${f.contact_id}`}`;
  if (f.deal_title) out += ` | *Deal*: ${f.deal_title}`;
  if (f.completed_at) out += `\n*Completed*: ${f.completed_at}`;
  return out;
}

export function formatFollowUpList(followUps: FollowUp[]): string {
  if (followUps.length === 0) return "No follow-ups found.";
  return followUps.map(formatFollowUp).join("\n\n");
}

export function formatPipelineReport(r: PipelineReport): string {
  let out = `# Pipeline Report\n\n`;
  out += `**Total Deals**: ${r.total_deals} | **Total Value**: $${r.total_value.toLocaleString()}\n\n`;
  out += `## Stages\n\n`;
  out += `| Stage | Deals | Value |\n|-------|-------|-------|\n`;
  for (const s of r.stages) {
    out += `| ${s.stage} | ${s.count} | $${s.value.toLocaleString()} |\n`;
  }
  if (r.recent_wins.length > 0) {
    out += `\n## Recent Wins\n\n`;
    out += r.recent_wins.map(formatDeal).join("\n\n");
  }
  if (r.recent_losses.length > 0) {
    out += `\n## Recent Losses\n\n`;
    out += r.recent_losses.map(formatDeal).join("\n\n");
  }
  return out;
}

export function formatDashboard(d: DashboardReport): string {
  let out = `# CRM Dashboard\n\n`;
  out += `| Metric | Value |\n|--------|-------|\n`;
  out += `| Contacts | ${d.total_contacts} |\n`;
  out += `| Deals | ${d.total_deals} |\n`;
  out += `| Open Pipeline | $${d.open_deals_value.toLocaleString()} |\n`;
  out += `| Won Revenue | $${d.won_deals_value.toLocaleString()} |\n`;
  out += `| Pending Follow-ups | ${d.pending_follow_ups} |\n`;
  out += `| Overdue Follow-ups | ${d.overdue_follow_ups} |\n`;

  if (d.upcoming_follow_ups.length > 0) {
    out += `\n## Upcoming Follow-ups\n\n`;
    out += formatFollowUpList(d.upcoming_follow_ups);
  }
  if (d.recent_interactions.length > 0) {
    out += `\n## Recent Activity\n\n`;
    out += formatInteractionList(d.recent_interactions);
  }
  return out;
}

export { DEAL_STAGES, INTERACTION_TYPES };
export default db;
