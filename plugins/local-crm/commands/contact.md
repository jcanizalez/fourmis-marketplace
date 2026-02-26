---
name: contact
description: Quick contact lookup — search the CRM by name, email, company, or tags
allowed-tools: crm_search_contacts, crm_get_contact, crm_list_contacts, crm_list_interactions, crm_list_deals, crm_list_follow_ups
---

# /contact

Search for contacts in the local CRM and display their full profile with recent activity.

## Instructions

1. If arguments are provided, use `crm_search_contacts` to find matching contacts
2. If no arguments, use `crm_list_contacts` to show the most recently updated contacts
3. When showing a contact, also fetch their recent interactions and deals for context
4. Present results clearly — highlight the most important info (name, company, last interaction)

## Arguments

$ARGUMENTS
