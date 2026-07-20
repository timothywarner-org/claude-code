<!--
  This is the MEMORY.md index - the ONE file loaded into context every session.
  Rules for this file:
    - One line per memory, and nothing else. No frontmatter. No fact bodies.
    - Format:  - [Title](filename.md) - short hook that says when it is relevant
    - The hook is what Claude scans to decide whether to recall the full file.
  In a real store this file is named MEMORY.md and the entries are plain .md.
  Here everything carries .example so the demo stays inert.
-->

- [Prefer uv over pip](user_prefers_uv.example.md) - default to uv for all Python work; pip only when uv is unavailable.
- [This service stays keyless](project_azure_keyless.example.md) - the field-service assistant must authenticate with managed identity, never an API key.
