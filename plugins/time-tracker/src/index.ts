import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createProject,
  listProjects,
  searchProjects,
  updateProject,
  archiveProject,
  startTimer,
  getActiveTimer,
  stopTimer,
  addTimeEntry,
  listTimeEntries,
  deleteTimeEntry,
  updateTimeEntry,
  getTimesheet,
  getProjectSummary,
  getWeeklySummary,
  type Project,
  type TimeEntry,
  type ActiveTimer,
  type TimesheetEntry,
  type ProjectSummary,
} from "./db.js";

const server = new McpServer({
  name: "time-tracker",
  version: "1.0.0",
});

// --- Formatting helpers ---

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20ac",
    GBP: "\u00a3",
    JPY: "\u00a5",
    CAD: "C$",
    AUD: "A$",
    MXN: "MX$",
  };
  const symbol = symbols[currency] || `${currency} `;
  return `${symbol}${amount.toFixed(2)}`;
}

function formatProject(p: Project): string {
  const lines = [
    `Project #${p.id}: ${p.name}`,
    p.client ? `  Client: ${p.client}` : null,
    p.description ? `  Description: ${p.description}` : null,
    p.hourly_rate
      ? `  Rate: ${formatCurrency(p.hourly_rate, p.currency)}/hr`
      : null,
    p.archived ? `  Status: ARCHIVED` : null,
    `  Created: ${p.created_at}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function formatTimeEntry(
  e: TimeEntry & { project_name?: string; client?: string | null }
): string {
  const project = e.project_name || `Project #${e.project_id}`;
  const duration = e.duration_minutes ? formatMinutes(e.duration_minutes) : "running";
  const lines = [
    `Entry #${e.id}: ${project} — ${duration}`,
    `  Time: ${e.start_time} → ${e.end_time || "ongoing"}`,
    e.description ? `  Description: ${e.description}` : null,
    `  Billable: ${e.billable ? "yes" : "no"}`,
    e.tags ? `  Tags: ${e.tags}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

function formatTimer(t: ActiveTimer, projectName: string): string {
  const start = new Date(t.start_time + "Z");
  const elapsed = Math.round((Date.now() - start.getTime()) / 60000);
  return [
    `\u23f1\ufe0f Timer running: ${projectName}`,
    `  Started: ${t.start_time} (${formatMinutes(elapsed)} ago)`,
    t.description ? `  Description: ${t.description}` : null,
    t.tags ? `  Tags: ${t.tags}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatTimesheetRow(e: TimesheetEntry): string {
  const duration = formatMinutes(e.duration_minutes);
  const amount = e.amount !== null ? ` (${formatCurrency(e.amount, "USD")})` : "";
  const billable = e.billable ? "\u2714" : "\u2718";
  return `${e.date} | ${e.project_name} | ${duration} | ${billable}${amount}${e.description ? ` — ${e.description}` : ""}`;
}

function formatProjectSummary(s: ProjectSummary): string {
  const total = formatMinutes(s.total_minutes);
  const billable = formatMinutes(s.billable_minutes);
  const amount =
    s.total_amount !== null
      ? ` | ${formatCurrency(s.total_amount, s.currency)}`
      : "";
  return `${s.project_name}${s.client ? ` (${s.client})` : ""}: ${total} total, ${billable} billable${amount} | ${s.entry_count} entries`;
}

// --- Tool: Create Project ---

server.tool(
  "time_create_project",
  `Create a new project for time tracking.

Use when the user starts tracking time for a new client, project, or initiative.
Do NOT use for creating time entries or starting timers — use time_start or time_add instead.

Limitations:
- Project names are not unique-constrained (avoid duplicates manually)
- hourly_rate is optional — leave empty for non-billable projects
- currency defaults to USD if not specified

Parameters:
- name (required): Project name (e.g. "Website Redesign", "API Integration")
- client (optional): Client name
- description (optional): Brief project description
- hourly_rate (optional): Billable rate per hour
- currency (optional): Currency code (USD, EUR, GBP, etc.)

Returns: Created project with ID, name, rate, and timestamps.`,
  {
    name: z.string().describe("Project name"),
    client: z.string().optional().describe("Client name"),
    description: z.string().optional().describe("Brief project description"),
    hourly_rate: z
      .number()
      .positive()
      .optional()
      .describe("Billable rate per hour"),
    currency: z
      .string()
      .length(3)
      .optional()
      .describe("Currency code (default: USD)"),
  },
  async (args) => {
    const project = createProject(args);
    return { content: [{ type: "text", text: formatProject(project) }] };
  }
);

// --- Tool: List/Search Projects ---

server.tool(
  "time_list_projects",
  `List or search time tracking projects.

Use to browse existing projects, find a project by name/client, or check available projects before starting a timer.
Do NOT use for listing time entries — use time_list instead.

Limitations:
- Archived projects hidden by default (use include_archived to see them)
- Search matches against name, client, and description fields
- Returns all non-archived projects if no query specified

Parameters:
- query (optional): Search text to filter by name, client, or description
- include_archived (optional): Include archived projects in results

Returns: List of matching projects with IDs, names, clients, rates.`,
  {
    query: z.string().optional().describe("Search text"),
    include_archived: z
      .boolean()
      .optional()
      .describe("Include archived projects"),
  },
  async (args) => {
    const projects = args.query
      ? searchProjects(args.query)
      : listProjects({ includeArchived: args.include_archived });
    if (projects.length === 0) {
      return {
        content: [{ type: "text", text: "No projects found." }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: `${projects.length} project(s):\n\n${projects.map(formatProject).join("\n\n")}`,
        },
      ],
    };
  }
);

// --- Tool: Update Project ---

server.tool(
  "time_update_project",
  `Update a project's details or archive it.

Use to change project name, client, rate, or to archive a completed project.
Do NOT use for tracking time — use time_start or time_add instead.

Limitations:
- Cannot unarchive via this tool (create a new project instead)
- Updating hourly_rate does not retroactively change existing time entry calculations
- Project must exist

Parameters:
- project_id (required): Project ID to update
- name (optional): New project name
- client (optional): New client name
- description (optional): New description
- hourly_rate (optional): New hourly rate
- currency (optional): New currency code
- archive (optional): Set to true to archive the project

Returns: Updated project details.`,
  {
    project_id: z.number().int().positive().describe("Project ID"),
    name: z.string().optional().describe("New project name"),
    client: z.string().optional().describe("New client name"),
    description: z.string().optional().describe("New description"),
    hourly_rate: z.number().positive().optional().describe("New hourly rate"),
    currency: z.string().length(3).optional().describe("New currency code"),
    archive: z.boolean().optional().describe("Archive this project"),
  },
  async (args) => {
    if (args.archive) {
      archiveProject(args.project_id);
      return {
        content: [
          {
            type: "text",
            text: `Project #${args.project_id} archived.`,
          },
        ],
      };
    }
    const project = updateProject(args.project_id, args);
    if (!project) {
      return {
        content: [
          {
            type: "text",
            text: `Project #${args.project_id} not found.`,
          },
        ],
        isError: true,
      };
    }
    return { content: [{ type: "text", text: formatProject(project) }] };
  }
);

// --- Tool: Start Timer ---

server.tool(
  "time_start",
  `Start a timer for a project. Only one timer can run at a time.

Use when the user begins working on a task and wants to track time in real-time.
Do NOT use for adding past time entries — use time_add instead.

Limitations:
- Only one active timer allowed at a time — stop the current one first
- Timer state persists across server restarts (stored in SQLite)
- Timer must be stopped with time_stop to create a time entry

Parameters:
- project_id (required): Project to track time for
- description (optional): What you're working on
- tags (optional): Comma-separated tags

Returns: Timer confirmation with start time and project name.`,
  {
    project_id: z.number().int().positive().describe("Project ID"),
    description: z
      .string()
      .optional()
      .describe("What you're working on"),
    tags: z.string().optional().describe("Comma-separated tags"),
  },
  async (args) => {
    try {
      const timer = startTimer(args);
      const projects = listProjects();
      const project = projects.find((p) => p.id === timer.project_id);
      return {
        content: [
          {
            type: "text",
            text: formatTimer(timer, project?.name || `Project #${timer.project_id}`),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Stop Timer ---

server.tool(
  "time_stop",
  `Stop the currently running timer and save the time entry.

Use when the user is done with their current task or taking a break.
Do NOT use if no timer is running — check with time_status first.

Limitations:
- Fails if no timer is running
- Duration is calculated from start to now, rounded to the nearest minute
- Creates a billable time entry by default

Returns: Completed time entry with duration and project details.`,
  {},
  async () => {
    try {
      const entry = stopTimer();
      const projects = listProjects({ includeArchived: true });
      const project = projects.find((p) => p.id === entry.project_id);
      return {
        content: [
          {
            type: "text",
            text: `Timer stopped.\n\n${formatTimeEntry({
              ...entry,
              project_name: project?.name,
              client: project?.client,
            })}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: Timer Status ---

server.tool(
  "time_status",
  `Check if a timer is currently running and show its elapsed time.

Use to see current timer status before starting/stopping, or for a quick status check.
Do NOT use for viewing past time entries — use time_list instead.

Limitations:
- Only shows the single active timer (only one can run at a time)
- Elapsed time is calculated in real-time from the start time

Returns: Active timer details with elapsed time, or "no timer running" message.`,
  {},
  async () => {
    const timer = getActiveTimer();
    if (!timer) {
      return {
        content: [{ type: "text", text: "No timer is currently running." }],
      };
    }
    const projects = listProjects({ includeArchived: true });
    const project = projects.find((p) => p.id === timer.project_id);
    return {
      content: [
        {
          type: "text",
          text: formatTimer(
            timer,
            project?.name || `Project #${timer.project_id}`
          ),
        },
      ],
    };
  }
);

// --- Tool: Add Time Entry (manual) ---

server.tool(
  "time_add",
  `Manually add a time entry for a past period.

Use when the user forgot to start a timer, or wants to log time retroactively.
Do NOT use for real-time tracking — use time_start/time_stop instead.

Limitations:
- end_time must be after start_time
- Duration is auto-calculated from start/end times
- Entries are billable by default (set billable=false to override)
- Times should be in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)

Parameters:
- project_id (required): Project to log time for
- start_time (required): When work started (ISO 8601)
- end_time (required): When work ended (ISO 8601)
- description (optional): What was done
- billable (optional): Whether this time is billable (default: true)
- tags (optional): Comma-separated tags

Returns: Created time entry with calculated duration.`,
  {
    project_id: z.number().int().positive().describe("Project ID"),
    start_time: z
      .string()
      .describe("Start time (ISO 8601: YYYY-MM-DDTHH:MM:SS)"),
    end_time: z
      .string()
      .describe("End time (ISO 8601: YYYY-MM-DDTHH:MM:SS)"),
    description: z.string().optional().describe("What was done"),
    billable: z
      .boolean()
      .optional()
      .describe("Whether billable (default: true)"),
    tags: z.string().optional().describe("Comma-separated tags"),
  },
  async (args) => {
    try {
      const entry = addTimeEntry(args);
      const projects = listProjects({ includeArchived: true });
      const project = projects.find((p) => p.id === entry.project_id);
      return {
        content: [
          {
            type: "text",
            text: `Time entry added.\n\n${formatTimeEntry({
              ...entry,
              project_name: project?.name,
              client: project?.client,
            })}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          { type: "text", text: `Error: ${(err as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

// --- Tool: List Time Entries ---

server.tool(
  "time_list",
  `List time entries with optional filters.

Use to review tracked time, filter by project or date range, or check recent entries.
Do NOT use for project listings — use time_list_projects instead.

Limitations:
- Returns max 100 entries by default (use limit parameter to adjust)
- Date filters use start_time of entries
- Results sorted newest first

Parameters:
- project_id (optional): Filter by project
- from (optional): Start date filter (YYYY-MM-DD)
- to (optional): End date filter (YYYY-MM-DD)
- billable (optional): Filter billable/non-billable entries
- limit (optional): Max entries to return (default: 100)

Returns: List of time entries with project names, durations, and details.`,
  {
    project_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Filter by project"),
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
    billable: z.boolean().optional().describe("Filter billable only"),
    limit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Max entries (default: 100)"),
  },
  async (args) => {
    const entries = listTimeEntries(args);
    if (entries.length === 0) {
      return {
        content: [{ type: "text", text: "No time entries found." }],
      };
    }
    const totalMinutes = entries.reduce(
      (sum, e) => sum + (e.duration_minutes || 0),
      0
    );
    return {
      content: [
        {
          type: "text",
          text: `${entries.length} entries (${formatMinutes(totalMinutes)} total):\n\n${entries.map(formatTimeEntry).join("\n\n")}`,
        },
      ],
    };
  }
);

// --- Tool: Delete Time Entry ---

server.tool(
  "time_delete",
  `Delete a time entry by ID.

Use to remove incorrectly logged entries or duplicate entries.
Do NOT use to stop a running timer — use time_stop instead.

Limitations:
- Deletion is permanent — cannot be undone
- Only deletes individual entries, not projects
- Entry must exist

Parameters:
- entry_id (required): Time entry ID to delete

Returns: Confirmation of deletion.`,
  {
    entry_id: z.number().int().positive().describe("Time entry ID to delete"),
  },
  async (args) => {
    const deleted = deleteTimeEntry(args.entry_id);
    if (!deleted) {
      return {
        content: [
          { type: "text", text: `Entry #${args.entry_id} not found.` },
        ],
        isError: true,
      };
    }
    return {
      content: [
        { type: "text", text: `Entry #${args.entry_id} deleted.` },
      ],
    };
  }
);

// --- Tool: Timesheet ---

server.tool(
  "time_timesheet",
  `Generate a timesheet report for a date range.

Use to create billable timesheets for invoicing, weekly/monthly reports, or client summaries.
Do NOT use for a quick status check — use time_status instead.

Limitations:
- Requires from and to date parameters
- Amount calculation requires hourly_rate on the project
- Non-billable entries show in the sheet but have no amount
- Groups by date, sorted chronologically

Parameters:
- from (required): Start date (YYYY-MM-DD)
- to (required): End date (YYYY-MM-DD)
- project_id (optional): Filter by specific project
- billable_only (optional): Only show billable entries

Returns: Formatted timesheet with dates, projects, hours, amounts, and totals.`,
  {
    from: z.string().describe("Start date (YYYY-MM-DD)"),
    to: z.string().describe("End date (YYYY-MM-DD)"),
    project_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Filter by project"),
    billable_only: z
      .boolean()
      .optional()
      .describe("Only billable entries"),
  },
  async (args) => {
    const entries = getTimesheet(args);
    if (entries.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No time entries found for ${args.from} to ${args.to}.`,
          },
        ],
      };
    }

    const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);
    const totalAmount = entries
      .filter((e) => e.amount !== null)
      .reduce((s, e) => s + (e.amount || 0), 0);

    const header = `Timesheet: ${args.from} to ${args.to}\n${"=".repeat(40)}`;
    const rows = entries.map(formatTimesheetRow);
    const footer = [
      `${"=".repeat(40)}`,
      `Total: ${formatMinutes(totalMinutes)}`,
      totalAmount > 0 ? `Billable: ${formatCurrency(totalAmount, "USD")}` : null,
      `Entries: ${entries.length}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `${header}\n\n${rows.join("\n")}\n\n${footer}`,
        },
      ],
    };
  }
);

// --- Tool: Summary Report ---

server.tool(
  "time_report",
  `Generate a summary report of time tracked across all projects.

Use for an overview of where time is being spent, weekly trends, or overall productivity metrics.
Do NOT use for detailed per-entry views — use time_list or time_timesheet instead.

Limitations:
- Project summary covers non-archived projects only
- Weekly summary defaults to last 4 weeks
- Amount calculations require hourly_rate on projects

Parameters:
- from (optional): Start date for project summary (YYYY-MM-DD)
- to (optional): End date for project summary (YYYY-MM-DD)
- weeks_back (optional): Number of weeks for weekly trend (default: 4)

Returns: Project breakdown with hours and amounts, plus weekly trend.`,
  {
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
    weeks_back: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Weeks for trend (default: 4)"),
  },
  async (args) => {
    const projects = getProjectSummary({
      from: args.from,
      to: args.to,
    });
    const weekly = getWeeklySummary({ weeks_back: args.weeks_back });

    const parts: string[] = [];

    // Project breakdown
    if (projects.length > 0) {
      const totalMinutes = projects.reduce((s, p) => s + p.total_minutes, 0);
      const totalBillable = projects.reduce(
        (s, p) => s + p.billable_minutes,
        0
      );
      const totalAmount = projects
        .filter((p) => p.total_amount !== null)
        .reduce((s, p) => s + (p.total_amount || 0), 0);

      parts.push(
        `Project Summary${args.from ? ` (${args.from} to ${args.to || "now"})` : ""}\n${"=".repeat(40)}`
      );
      parts.push(projects.map(formatProjectSummary).join("\n"));
      parts.push(
        `\nTotal: ${formatMinutes(totalMinutes)} tracked, ${formatMinutes(totalBillable)} billable${totalAmount > 0 ? `, ${formatCurrency(totalAmount, "USD")} earned` : ""}`
      );
    } else {
      parts.push("No project data found.");
    }

    // Weekly trend
    if (weekly.length > 0) {
      parts.push(`\nWeekly Trend\n${"=".repeat(40)}`);
      for (const w of weekly) {
        parts.push(
          `${w.week_start}: ${formatMinutes(w.total_minutes)} total, ${formatMinutes(w.billable_minutes)} billable | ${w.project_count} projects, ${w.entry_count} entries`
        );
      }
    }

    return {
      content: [{ type: "text", text: parts.join("\n") }],
    };
  }
);

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Time Tracker MCP server running on stdio");
}

main().catch(console.error);
