/**
 * Local CRM — MCP Server for managing contacts, deals, follow-ups, and
 * interactions. All data stored locally in SQLite.
 *
 * Environment:
 *   CRM_DB_DIR — directory for the SQLite database file (default: ./data)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createContact,
  searchContacts,
  listContacts,
  updateContact,
  deleteContact,
  getContactById,
  createDeal,
  getDealById,
  moveDeal,
  listDeals,
  deleteDeal,
  logInteraction,
  listInteractions,
  scheduleFollowUp,
  completeFollowUp,
  listFollowUps,
  getPipelineReport,
  getDashboard,
  formatContact,
  formatContactList,
  formatDeal,
  formatDealList,
  formatInteractionList,
  formatFollowUp,
  formatFollowUpList,
  formatPipelineReport,
  formatDashboard,
  DEAL_STAGES,
  INTERACTION_TYPES,
} from "./db.js";

// ─── Create MCP Server ────────────────────────────────────────────

const server = new McpServer({
  name: "local-crm",
  version: "1.0.0",
});

// ─── Contact Tools ────────────────────────────────────────────────

server.tool(
  "crm_create_contact",
  `Create a new contact in the local CRM database.

Use this tool when the user wants to add a person to their CRM — a client, lead, partner, or any business contact. At minimum, a name is required; all other fields are optional.

Do NOT use this tool for:
- Updating an existing contact (use crm_update_contact instead)
- Creating deals or business opportunities (use crm_create_deal instead)

Limitations:
- Email is not validated beyond basic format — no deliverability check
- Tags are stored as a comma-separated string, not a normalized table
- Duplicate names are allowed — the CRM does not enforce unique names
- Phone numbers are stored as-is with no formatting or validation

Returns: Markdown-formatted contact card with all fields, ID, and timestamps.`,
  {
    name: z.string().describe("Full name of the contact"),
    email: z.string().optional().describe("Email address"),
    phone: z
      .string()
      .optional()
      .describe("Phone number in any format"),
    company: z
      .string()
      .optional()
      .describe("Company or organization name"),
    role: z
      .string()
      .optional()
      .describe("Job title or role (e.g. 'CTO', 'Founder')"),
    tags: z
      .string()
      .optional()
      .describe(
        "Comma-separated tags for categorization (e.g. 'client,vip,tech')"
      ),
    notes: z
      .string()
      .optional()
      .describe("Free-text notes about the contact"),
  },
  async ({ name, email, phone, company, role, tags, notes }) => {
    const contact = createContact({
      name,
      email,
      phone,
      company,
      role,
      tags,
      notes,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Contact created successfully.\n\n${formatContact(contact)}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_search_contacts",
  `Search for contacts in the CRM by name, email, company, tags, or notes.

Use this tool when the user wants to find a specific contact or group of contacts. The search is case-insensitive and matches partial strings across multiple fields.

Do NOT use this tool for:
- Listing all contacts (use crm_list_contacts instead)
- Getting a contact by their exact ID (use crm_get_contact instead)

Limitations:
- Search uses SQL LIKE with wildcards — it's a substring match, not full-text search
- Returns a maximum of 20 results by default
- Does not rank results by relevance — results are ordered by last updated
- Searches across name, email, company, tags, and notes simultaneously

Returns: Markdown-formatted list of matching contacts with all fields and IDs. Returns "No contacts found." if no matches.`,
  {
    query: z
      .string()
      .describe(
        "Search query — matches against name, email, company, tags, and notes"
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum results to return (1-100). Default: 20"),
  },
  async ({ query, limit }) => {
    const contacts = searchContacts(query, limit);
    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${contacts.length} contact(s) matching "${query}".\n\n${formatContactList(contacts)}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_get_contact",
  `Get a single contact's full details by their ID.

Use this tool when you have a contact's ID and need their complete information — name, email, phone, company, tags, notes, and timestamps.

Do NOT use this tool for:
- Searching contacts by name or keyword (use crm_search_contacts instead)
- Listing multiple contacts (use crm_list_contacts instead)

Limitations:
- Requires the exact numeric contact ID
- Does not include the contact's deals, interactions, or follow-ups — query those separately

Returns: Markdown-formatted contact card with all fields. Returns an error message if the ID doesn't exist.`,
  {
    id: z.number().int().positive().describe("The contact's numeric ID"),
  },
  async ({ id }) => {
    const contact = getContactById(id);
    if (!contact) {
      return {
        content: [
          { type: "text" as const, text: `Contact with ID ${id} not found.` },
        ],
      };
    }
    return {
      content: [{ type: "text" as const, text: formatContact(contact) }],
    };
  }
);

server.tool(
  "crm_list_contacts",
  `List contacts in the CRM with optional filtering by company or tag.

Use this tool when the user wants to browse their contacts, optionally filtered by company or tag. Returns contacts ordered by most recently updated.

Do NOT use this tool for:
- Searching by keyword across all fields (use crm_search_contacts instead)
- Getting a single contact by ID (use crm_get_contact instead)

Limitations:
- Company filter uses partial matching (LIKE)
- Tag filter uses partial matching within the comma-separated tags string
- Maximum 100 contacts per request
- No sorting options — always ordered by last updated (newest first)

Returns: Markdown-formatted list of contacts with all fields. Supports pagination via offset parameter.`,
  {
    company: z
      .string()
      .optional()
      .describe("Filter by company name (partial match)"),
    tag: z
      .string()
      .optional()
      .describe("Filter by tag (partial match within comma-separated tags)"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum results (1-100). Default: 20"),
    offset: z
      .number()
      .min(0)
      .optional()
      .describe("Skip this many results for pagination. Default: 0"),
  },
  async ({ company, tag, limit, offset }) => {
    const contacts = listContacts({ company, tag, limit, offset });
    return {
      content: [
        {
          type: "text" as const,
          text: `Showing ${contacts.length} contact(s).\n\n${formatContactList(contacts)}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_update_contact",
  `Update an existing contact's information.

Use this tool when the user wants to change a contact's details — name, email, phone, company, role, tags, or notes. Only the fields you provide will be updated; others remain unchanged.

Do NOT use this tool for:
- Creating new contacts (use crm_create_contact instead)
- Deleting contacts (use crm_delete_contact instead)

Limitations:
- Requires the exact numeric contact ID
- Cannot update created_at timestamp
- Tags replace the entire tags field — to add a tag, include all existing tags plus the new one
- Returns an error if the contact ID doesn't exist

Returns: Markdown-formatted updated contact card with all fields and new timestamps.`,
  {
    id: z.number().int().positive().describe("The contact's numeric ID"),
    name: z.string().optional().describe("Updated name"),
    email: z.string().optional().describe("Updated email"),
    phone: z.string().optional().describe("Updated phone"),
    company: z.string().optional().describe("Updated company"),
    role: z.string().optional().describe("Updated role/title"),
    tags: z
      .string()
      .optional()
      .describe("Updated tags (replaces all existing tags)"),
    notes: z.string().optional().describe("Updated notes"),
  },
  async ({ id, ...data }) => {
    const contact = updateContact(id, data);
    if (!contact) {
      return {
        content: [
          { type: "text" as const, text: `Contact with ID ${id} not found.` },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: `Contact updated.\n\n${formatContact(contact)}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_delete_contact",
  `Permanently delete a contact and all their associated deals, interactions, and follow-ups.

Use this tool when the user wants to remove a contact from the CRM entirely. This is a destructive operation — all related data is cascade-deleted.

IMPORTANT: Confirm with the user before deleting. This cannot be undone.

Do NOT use this tool for:
- Updating a contact (use crm_update_contact instead)
- Archiving — there is no archive feature; deletion is permanent

Limitations:
- Permanently deletes the contact AND all linked deals, interactions, and follow-ups (CASCADE)
- Cannot be undone — there is no trash or undo feature
- Requires the exact numeric contact ID

Returns: Confirmation message if deleted, or error if the contact ID doesn't exist.`,
  {
    id: z
      .number()
      .int()
      .positive()
      .describe("The contact's numeric ID to delete"),
  },
  async ({ id }) => {
    const contact = getContactById(id);
    if (!contact) {
      return {
        content: [
          { type: "text" as const, text: `Contact with ID ${id} not found.` },
        ],
      };
    }
    deleteContact(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Contact "${contact.name}" (ID: ${id}) has been permanently deleted along with all associated deals, interactions, and follow-ups.`,
        },
      ],
    };
  }
);

// ─── Deal Tools ───────────────────────────────────────────────────

server.tool(
  "crm_create_deal",
  `Create a new deal (business opportunity) linked to an existing contact.

Use this tool when the user wants to track a potential sale, project, or business opportunity. Every deal must be associated with a contact.

Do NOT use this tool for:
- Creating contacts (use crm_create_contact first, then create the deal)
- Moving a deal to a different stage (use crm_move_deal instead)

Limitations:
- Requires a valid contact_id — the contact must exist first
- Deal stages are fixed: lead, qualified, proposal, negotiation, won, lost
- Amount defaults to 0 if not provided
- Currency is a free-text string (default 'USD') — no currency conversion
- expected_close should be a date string in YYYY-MM-DD format

Returns: Markdown-formatted deal card with stage emoji, value, contact name, and timestamps.`,
  {
    contact_id: z
      .number()
      .int()
      .positive()
      .describe("ID of the contact this deal belongs to"),
    title: z
      .string()
      .describe("Deal title (e.g. 'Website redesign for Acme')"),
    amount: z
      .number()
      .min(0)
      .optional()
      .describe("Deal value in the specified currency. Default: 0"),
    currency: z
      .string()
      .optional()
      .describe("Currency code (e.g. 'USD', 'EUR'). Default: 'USD'"),
    stage: z
      .enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"])
      .optional()
      .describe("Initial pipeline stage. Default: 'lead'"),
    notes: z.string().optional().describe("Notes about the deal"),
    expected_close: z
      .string()
      .optional()
      .describe("Expected close date in YYYY-MM-DD format"),
  },
  async ({ contact_id, title, amount, currency, stage, notes, expected_close }) => {
    const contact = getContactById(contact_id);
    if (!contact) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Contact with ID ${contact_id} not found. Create the contact first with crm_create_contact.`,
          },
        ],
      };
    }
    const deal = createDeal({
      contact_id,
      title,
      amount,
      currency,
      stage: stage as any,
      notes,
      expected_close,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Deal created.\n\n${formatDeal(deal)}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_move_deal",
  `Move a deal to a different pipeline stage.

Use this tool when a deal progresses (or regresses) through the sales pipeline. The pipeline stages in order are: lead → qualified → proposal → negotiation → won/lost.

Do NOT use this tool for:
- Creating new deals (use crm_create_deal instead)
- Updating deal title, amount, or notes (not yet supported — delete and recreate)

Limitations:
- Stages are fixed: lead, qualified, proposal, negotiation, won, lost
- You can move to any stage (forward or backward) — there's no enforced ordering
- Moving to 'won' or 'lost' does not trigger any automatic actions
- Requires the exact numeric deal ID

Returns: Markdown-formatted updated deal card with the new stage.`,
  {
    id: z.number().int().positive().describe("The deal's numeric ID"),
    stage: z
      .enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"])
      .describe("The new pipeline stage"),
  },
  async ({ id, stage }) => {
    const deal = moveDeal(id, stage as any);
    if (!deal) {
      return {
        content: [
          { type: "text" as const, text: `Deal with ID ${id} not found.` },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: `Deal moved to "${stage}".\n\n${formatDeal(deal)}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_list_deals",
  `List deals in the pipeline with optional filtering by stage or contact.

Use this tool when the user wants to see their deals — the full pipeline, deals in a specific stage, or all deals for a particular contact.

Do NOT use this tool for:
- Getting pipeline analytics (use crm_pipeline_report instead)
- Creating deals (use crm_create_deal instead)

Limitations:
- Returns a maximum of 50 deals per request
- No sorting options — always ordered by last updated (newest first)
- Cannot filter by amount range or date range

Returns: Markdown-formatted list of deals with stage emojis, values, contact names, and timestamps.`,
  {
    stage: z
      .enum(["lead", "qualified", "proposal", "negotiation", "won", "lost"])
      .optional()
      .describe("Filter by pipeline stage"),
    contact_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Filter by contact ID"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum results (1-100). Default: 50"),
  },
  async ({ stage, contact_id, limit }) => {
    const deals = listDeals({ stage: stage as any, contact_id, limit });
    return {
      content: [
        {
          type: "text" as const,
          text: `Showing ${deals.length} deal(s).\n\n${formatDealList(deals)}`,
        },
      ],
    };
  }
);

// ─── Interaction Tools ────────────────────────────────────────────

server.tool(
  "crm_log_interaction",
  `Log an interaction (call, email, meeting, note, or message) with a contact.

Use this tool to record a touchpoint with a contact — a phone call, email exchange, meeting, or just a note. Interactions build a timeline of your relationship with each contact.

Do NOT use this tool for:
- Scheduling future follow-ups (use crm_schedule_follow_up instead)
- Creating deals (use crm_create_deal instead)

Limitations:
- Interaction types are fixed: call, email, meeting, note, message
- occurred_at defaults to the current timestamp if not provided
- Cannot edit or delete interactions after creation
- Optionally links to a deal — the deal must exist if deal_id is provided

Returns: Markdown-formatted interaction entry with type emoji, summary, contact name, and timestamp.`,
  {
    contact_id: z
      .number()
      .int()
      .positive()
      .describe("ID of the contact this interaction is with"),
    summary: z
      .string()
      .describe(
        "Brief summary of the interaction (e.g. 'Discussed project timeline')"
      ),
    type: z
      .enum(["call", "email", "meeting", "note", "message"])
      .optional()
      .describe("Type of interaction. Default: 'note'"),
    details: z
      .string()
      .optional()
      .describe("Detailed notes about the interaction"),
    deal_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Link this interaction to a specific deal"),
    occurred_at: z
      .string()
      .optional()
      .describe(
        "When the interaction occurred (ISO 8601 format). Default: now"
      ),
  },
  async ({ contact_id, summary, type, details, deal_id, occurred_at }) => {
    const contact = getContactById(contact_id);
    if (!contact) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Contact with ID ${contact_id} not found.`,
          },
        ],
      };
    }
    const interaction = logInteraction({
      contact_id,
      deal_id,
      type: type as any,
      summary,
      details,
      occurred_at,
    });
    const formatted = `📋 **${interaction.type.toUpperCase()}** with ${contact.name}\n**Summary**: ${interaction.summary}`;
    const extra = interaction.details
      ? `\n**Details**: ${interaction.details}`
      : "";
    return {
      content: [
        {
          type: "text" as const,
          text: `Interaction logged.\n\n${formatted}${extra}\n*Occurred*: ${interaction.occurred_at}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_list_interactions",
  `List interaction history, optionally filtered by contact, deal, or type.

Use this tool when the user wants to review the timeline of interactions with a contact or related to a deal.

Do NOT use this tool for:
- Viewing follow-ups or scheduled tasks (use crm_list_follow_ups instead)
- Viewing deals (use crm_list_deals instead)

Limitations:
- Returns a maximum of 25 interactions per request
- Cannot search interaction text — only filter by contact, deal, or type
- Ordered by occurrence date (newest first)
- Does not support date range filtering

Returns: Markdown-formatted list of interactions with type emojis, summaries, contact names, and timestamps.`,
  {
    contact_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Filter by contact ID"),
    deal_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Filter by deal ID"),
    type: z
      .enum(["call", "email", "meeting", "note", "message"])
      .optional()
      .describe("Filter by interaction type"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum results (1-100). Default: 25"),
  },
  async ({ contact_id, deal_id, type, limit }) => {
    const interactions = listInteractions({
      contact_id,
      deal_id,
      type: type as any,
      limit,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Showing ${interactions.length} interaction(s).\n\n${formatInteractionList(interactions)}`,
        },
      ],
    };
  }
);

// ─── Follow-Up Tools ──────────────────────────────────────────────

server.tool(
  "crm_schedule_follow_up",
  `Schedule a follow-up reminder for a contact, optionally linked to a deal.

Use this tool when the user needs to remember to reach out to a contact by a certain date — send a proposal, check in after a meeting, follow up on a lead, etc.

Do NOT use this tool for:
- Logging past interactions (use crm_log_interaction instead)
- Creating calendar events (the CRM doesn't integrate with calendars)

Limitations:
- Due date must be in YYYY-MM-DD format
- No recurring follow-ups — each follow-up is a one-time reminder
- No notifications or alerts — follow-ups must be checked manually via crm_list_follow_ups
- Cannot be edited after creation — complete and create a new one if details change
- Requires a valid contact_id

Returns: Markdown-formatted follow-up entry with due date, status, contact name, and deal title if linked.`,
  {
    contact_id: z
      .number()
      .int()
      .positive()
      .describe("ID of the contact to follow up with"),
    description: z
      .string()
      .describe(
        "What to do in this follow-up (e.g. 'Send revised proposal')"
      ),
    due_date: z
      .string()
      .describe("Due date in YYYY-MM-DD format (e.g. '2026-03-15')"),
    deal_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Link this follow-up to a specific deal"),
  },
  async ({ contact_id, description, due_date, deal_id }) => {
    const contact = getContactById(contact_id);
    if (!contact) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Contact with ID ${contact_id} not found.`,
          },
        ],
      };
    }
    const followUp = scheduleFollowUp({
      contact_id,
      deal_id,
      description,
      due_date,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Follow-up scheduled.\n\n${formatFollowUp(followUp)}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_complete_follow_up",
  `Mark a follow-up as completed.

Use this tool when the user has completed a follow-up action and wants to mark it done.

Do NOT use this tool for:
- Deleting follow-ups (completed follow-ups remain in the history)
- Editing follow-ups (create a new one instead)

Limitations:
- Requires the exact numeric follow-up ID
- Cannot undo — once completed, it stays completed
- Does not automatically create a new follow-up or log an interaction

Returns: Markdown-formatted updated follow-up entry with completion timestamp.`,
  {
    id: z.number().int().positive().describe("The follow-up's numeric ID"),
  },
  async ({ id }) => {
    const followUp = completeFollowUp(id);
    if (!followUp) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Follow-up with ID ${id} not found.`,
          },
        ],
      };
    }
    return {
      content: [
        {
          type: "text" as const,
          text: `Follow-up completed.\n\n${formatFollowUp(followUp)}`,
        },
      ],
    };
  }
);

server.tool(
  "crm_list_follow_ups",
  `List follow-ups, optionally filtered by status, contact, or overdue flag.

Use this tool when the user wants to see their pending follow-ups, check for overdue items, or review completed follow-ups.

Do NOT use this tool for:
- Viewing interaction history (use crm_list_interactions instead)
- Creating new follow-ups (use crm_schedule_follow_up instead)

Limitations:
- Returns a maximum of 25 follow-ups per request
- Ordered by due date (earliest first)
- The overdue flag only returns pending follow-ups past their due date
- Cannot filter by date range

Returns: Markdown-formatted list of follow-ups with status markers (📅 pending, ⚠️ overdue, ✅ completed), due dates, contact names, and deal titles.`,
  {
    status: z
      .enum(["pending", "completed"])
      .optional()
      .describe("Filter by status. Omit to show all."),
    contact_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Filter by contact ID"),
    overdue: z
      .boolean()
      .optional()
      .describe(
        "Set to true to show only overdue pending follow-ups. Default: false"
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum results (1-100). Default: 25"),
  },
  async ({ status, contact_id, overdue, limit }) => {
    const followUps = listFollowUps({ status, contact_id, overdue, limit });
    const label = overdue
      ? "overdue"
      : status
        ? status
        : "total";
    return {
      content: [
        {
          type: "text" as const,
          text: `Showing ${followUps.length} ${label} follow-up(s).\n\n${formatFollowUpList(followUps)}`,
        },
      ],
    };
  }
);

// ─── Report Tools ─────────────────────────────────────────────────

server.tool(
  "crm_pipeline_report",
  `Generate a pipeline report showing deals by stage with values and totals.

Use this tool when the user wants to see an overview of their sales pipeline — how many deals are in each stage, total pipeline value, and recent wins/losses.

Do NOT use this tool for:
- Viewing individual deals (use crm_list_deals instead)
- Getting a full CRM dashboard (use crm_dashboard instead)

Limitations:
- Shows all deals in the database, not filtered by time period
- Recent wins/losses shows only the 5 most recent in each category
- Amount values are summed as-is — no currency conversion for mixed currencies

Returns: Markdown-formatted report with a stage breakdown table, total deals count, total pipeline value, and lists of recent wins and losses.`,
  {},
  async () => {
    const report = getPipelineReport();
    return {
      content: [
        { type: "text" as const, text: formatPipelineReport(report) },
      ],
    };
  }
);

server.tool(
  "crm_dashboard",
  `Show a high-level CRM dashboard with key metrics, upcoming follow-ups, and recent activity.

Use this tool when the user wants a quick overview of their CRM — contact count, deal pipeline, follow-up status, and recent interactions. Good for daily check-ins or status updates.

Do NOT use this tool for:
- Detailed pipeline analysis (use crm_pipeline_report instead)
- Finding specific contacts or deals (use search/list tools instead)

Limitations:
- Shows the 5 most recent interactions and 5 most urgent follow-ups
- Monetary values are summed without currency conversion
- Does not include historical trends or graphs — just current state

Returns: Markdown-formatted dashboard with a metrics table, upcoming follow-ups section, and recent activity section.`,
  {},
  async () => {
    const dashboard = getDashboard();
    return {
      content: [
        { type: "text" as const, text: formatDashboard(dashboard) },
      ],
    };
  }
);

// ─── Start Server ─────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Local CRM MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
