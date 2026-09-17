# MCP boundary

Alexandria can later expose an MCP server without coupling the UI to the protocol. Implement tools against the domain services and repositories, not directly against React components.

Planned tools:

- `search_library`
- `get_book_notes`
- `get_highlights`
- `get_principle`
- `find_related_principles`
- `create_interpretation`
- `create_connection`
- `log_application`
- `log_feedback`
- `revise_model`
- `get_due_retrievals`
- `record_retrieval_score`

The current client also preserves the prototype's optional browser MCP hooks in `services/mcp/browser-tools.ts` when a compatible host supplies `document.modelContext`.
