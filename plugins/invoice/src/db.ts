/**
 * Database layer for the invoice plugin.
 *
 * Uses better-sqlite3 for synchronous SQLite access.
 * Auto-creates the database and schema on first run.
 * All data stored locally — zero cloud dependencies.
 *
 * Tables: clients, invoices, line_items, payments
 */

import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─── Database Setup ───────────────────────────────────────────────

const dbDir = process.env.INVOICE_DB_DIR || path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "invoices.db");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ───────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    client_id INTEGER NOT NULL,
    status TEXT DEFAULT 'draft',
    currency TEXT DEFAULT 'USD',
    tax_rate REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    due_date TEXT,
    issued_date TEXT DEFAULT (date('now')),
    paid_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE TABLE IF NOT EXISTS line_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL NOT NULL,
    amount REAL GENERATED ALWAYS AS (quantity * unit_price) STORED,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    method TEXT DEFAULT 'other',
    reference TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    paid_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
  CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
  CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON line_items(invoice_id);
  CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
`);

// ─── Invoice Number Generator ─────────────────────────────────────

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  // Get the count of invoices this month
  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?`
    )
    .get(`INV-${year}${month}-%`) as { count: number } | undefined;

  const seq = ((row?.count ?? 0) + 1).toString().padStart(3, "0");
  return `INV-${year}${month}-${seq}`;
}

// ─── Client CRUD ──────────────────────────────────────────────────

export interface Client {
  id: number;
  name: string;
  email: string | null;
  company: string | null;
  address: string;
  phone: string;
  notes: string;
  created_at: string;
}

export function createClient(data: {
  name: string;
  email?: string;
  company?: string;
  address?: string;
  phone?: string;
  notes?: string;
}): Client {
  const result = db
    .prepare(
      `INSERT INTO clients (name, email, company, address, phone, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      data.name,
      data.email || null,
      data.company || null,
      data.address || "",
      data.phone || "",
      data.notes || ""
    );

  return db
    .prepare(`SELECT * FROM clients WHERE id = ?`)
    .get(result.lastInsertRowid) as Client;
}

export function getClient(id: number): Client | null {
  return (db.prepare(`SELECT * FROM clients WHERE id = ?`).get(id) as Client) || null;
}

export function listClients(): Client[] {
  return db.prepare(`SELECT * FROM clients ORDER BY name`).all() as Client[];
}

export function searchClients(query: string): Client[] {
  const pattern = `%${query}%`;
  return db
    .prepare(
      `SELECT * FROM clients WHERE name LIKE ? OR email LIKE ? OR company LIKE ? ORDER BY name`
    )
    .all(pattern, pattern, pattern) as Client[];
}

// ─── Invoice CRUD ─────────────────────────────────────────────────

export interface Invoice {
  id: number;
  invoice_number: string;
  client_id: number;
  status: string;
  currency: string;
  tax_rate: number;
  discount: number;
  notes: string;
  due_date: string | null;
  issued_date: string;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  paid_at: string;
}

export interface InvoiceWithDetails extends Invoice {
  client: Client;
  line_items: LineItem[];
  payments: Payment[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
}

export function createInvoice(data: {
  client_id: number;
  items: { description: string; quantity: number; unit_price: number }[];
  currency?: string;
  tax_rate?: number;
  discount?: number;
  notes?: string;
  due_date?: string;
}): InvoiceWithDetails {
  const invoiceNumber = generateInvoiceNumber();

  const insertInvoice = db.prepare(
    `INSERT INTO invoices (invoice_number, client_id, currency, tax_rate, discount, notes, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertItem = db.prepare(
    `INSERT INTO line_items (invoice_id, description, quantity, unit_price)
     VALUES (?, ?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    const result = insertInvoice.run(
      invoiceNumber,
      data.client_id,
      data.currency || "USD",
      data.tax_rate || 0,
      data.discount || 0,
      data.notes || "",
      data.due_date || null
    );

    const invoiceId = result.lastInsertRowid as number;

    for (const item of data.items) {
      insertItem.run(invoiceId, item.description, item.quantity, item.unit_price);
    }

    return invoiceId;
  });

  const invoiceId = transaction();
  return getInvoiceWithDetails(invoiceId)!;
}

export function getInvoiceWithDetails(id: number): InvoiceWithDetails | null {
  const invoice = db
    .prepare(`SELECT * FROM invoices WHERE id = ?`)
    .get(id) as Invoice | undefined;

  if (!invoice) return null;

  const client = getClient(invoice.client_id)!;
  const line_items = db
    .prepare(`SELECT * FROM line_items WHERE invoice_id = ? ORDER BY id`)
    .all(id) as LineItem[];
  const payments = db
    .prepare(`SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at`)
    .all(id) as Payment[];

  const subtotal = line_items.reduce((sum, item) => sum + item.amount, 0);
  const discount_amount = subtotal * (invoice.discount / 100);
  const taxable = subtotal - discount_amount;
  const tax_amount = taxable * (invoice.tax_rate / 100);
  const total = taxable + tax_amount;
  const amount_paid = payments.reduce((sum, p) => sum + p.amount, 0);
  const amount_due = total - amount_paid;

  return {
    ...invoice,
    client,
    line_items,
    payments,
    subtotal,
    tax_amount,
    discount_amount,
    total,
    amount_paid,
    amount_due,
  };
}

export function getInvoiceByNumber(invoiceNumber: string): InvoiceWithDetails | null {
  const invoice = db
    .prepare(`SELECT * FROM invoices WHERE invoice_number = ?`)
    .get(invoiceNumber) as Invoice | undefined;
  if (!invoice) return null;
  return getInvoiceWithDetails(invoice.id);
}

export function listInvoices(filters?: {
  status?: string;
  client_id?: number;
  limit?: number;
}): InvoiceWithDetails[] {
  let sql = `SELECT id FROM invoices WHERE 1=1`;
  const params: unknown[] = [];

  if (filters?.status) {
    sql += ` AND status = ?`;
    params.push(filters.status);
  }
  if (filters?.client_id) {
    sql += ` AND client_id = ?`;
    params.push(filters.client_id);
  }

  sql += ` ORDER BY created_at DESC`;

  if (filters?.limit) {
    sql += ` LIMIT ?`;
    params.push(filters.limit);
  }

  const rows = db.prepare(sql).all(...params) as { id: number }[];
  return rows.map((r) => getInvoiceWithDetails(r.id)!).filter(Boolean);
}

export function updateInvoiceStatus(
  id: number,
  status: string
): InvoiceWithDetails | null {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE invoices SET status = ?, updated_at = ?, paid_date = CASE WHEN ? = 'paid' THEN ? ELSE paid_date END WHERE id = ?`
  ).run(status, now, status, now, id);
  return getInvoiceWithDetails(id);
}

// ─── Payment Operations ───────────────────────────────────────────

export function recordPayment(data: {
  invoice_id: number;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
}): InvoiceWithDetails | null {
  db.prepare(
    `INSERT INTO payments (invoice_id, amount, method, reference, notes)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    data.invoice_id,
    data.amount,
    data.method || "other",
    data.reference || "",
    data.notes || ""
  );

  // Auto-update status if fully paid
  const invoice = getInvoiceWithDetails(data.invoice_id);
  if (invoice && invoice.amount_due <= 0.01) {
    updateInvoiceStatus(data.invoice_id, "paid");
    return getInvoiceWithDetails(data.invoice_id);
  }

  return invoice;
}

// ─── Reports ──────────────────────────────────────────────────────

export interface RevenueReport {
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_overdue: number;
  invoice_count: number;
  paid_count: number;
  outstanding_count: number;
  overdue_count: number;
  by_status: { status: string; count: number; total: number }[];
  by_client: { client_name: string; total: number; paid: number; outstanding: number }[];
}

export function getRevenueReport(): RevenueReport {
  const invoices = listInvoices();
  const today = new Date().toISOString().split("T")[0];

  let total_invoiced = 0;
  let total_paid = 0;
  let total_outstanding = 0;
  let total_overdue = 0;
  let paid_count = 0;
  let outstanding_count = 0;
  let overdue_count = 0;

  const statusMap = new Map<string, { count: number; total: number }>();
  const clientMap = new Map<
    string,
    { client_name: string; total: number; paid: number; outstanding: number }
  >();

  for (const inv of invoices) {
    total_invoiced += inv.total;
    total_paid += inv.amount_paid;

    if (inv.status === "paid") {
      paid_count++;
    } else if (inv.status !== "draft" && inv.status !== "cancelled") {
      total_outstanding += inv.amount_due;
      outstanding_count++;
      if (inv.due_date && inv.due_date < today) {
        total_overdue += inv.amount_due;
        overdue_count++;
      }
    }

    // By status
    const existing = statusMap.get(inv.status) || { count: 0, total: 0 };
    existing.count++;
    existing.total += inv.total;
    statusMap.set(inv.status, existing);

    // By client
    const clientKey = inv.client.name;
    const clientData = clientMap.get(clientKey) || {
      client_name: clientKey,
      total: 0,
      paid: 0,
      outstanding: 0,
    };
    clientData.total += inv.total;
    clientData.paid += inv.amount_paid;
    clientData.outstanding += inv.amount_due;
    clientMap.set(clientKey, clientData);
  }

  return {
    total_invoiced,
    total_paid,
    total_outstanding,
    total_overdue,
    invoice_count: invoices.length,
    paid_count,
    outstanding_count,
    overdue_count,
    by_status: Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      ...data,
    })),
    by_client: Array.from(clientMap.values()).sort((a, b) => b.total - a.total),
  };
}
