# Database boundary

No database is required for the exported prototype. When persistent storage is introduced, implement repositories against the interfaces in `services/retrieval` and map database rows to the domain models in `models/domain.ts`. This keeps the UI independent of a specific database provider.
