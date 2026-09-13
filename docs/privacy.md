# Privacy and data handling

Resume source and review conversations are used only to provide the requested workspace and review. They are not added to training data or evaluation datasets without explicit opt-in.

Users can export their `.tex` source and compiled PDF. Hosted deployments must expose project deletion and account deletion, which remove user-owned projects, versions, sessions, facts, issues, proposed edits, and stored compiler artifacts according to the database retention policy.

Application telemetry must use identifiers and operational metadata only. Do not send resume text, LaTeX source, contact details, conversation content, or AI prompt bodies to analytics or error-monitoring providers.

OpenAI calls are made with response storage disabled. Compiler workspaces are ephemeral and must be removed after each request.
