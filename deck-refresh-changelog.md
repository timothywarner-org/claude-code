# Deck Refresh Changelog — 2026-05-25

Source: `warner-claude-code.pptx`, refreshed for 2026-05-26 O'Reilly class delivery ("Claude Code and Large-Context Reasoning").

## Summary

- **Total slides**: 33
- **Slides touched**: 1
- **Model ID swaps**: 0 (deck contained no model IDs to swap)
- **MCP transport fixes**: 0 (deck contained no MCP transport references)
- **Skills/commands terminology fixes**: 0 (deck contained no skills-vs-commands references)
- **Knowledge-cutoff / pricing / context-window fixes**: 0 (none present in text)

## Important finding

This deck is **almost entirely image-based**. Slides 10 through 32 are picture-only layouts; each title placeholder contains a single space character and the teaching content (code snippets, diagrams, screenshots) is rendered as PNGs. The text frames carry no model IDs, MCP transport names, MCP spec revisions, pricing, or skills/commands terminology. There was nothing in the textual content to refresh against the ground-truth fact sheet.

If any of those facts need updating, the source-of-truth is the image assets themselves, not the slide text frames. That is out of scope for this refresh (and would require re-rendering screenshots, which I was told not to do).

What was wrong and got fixed: the title slide read "**GitHub Copilot for Almost Everyone**" — wrong course branding for tomorrow's class. The slide-1 speaker notes were template-review Q&A scratch ("How much flexibility am I allowed with these slide layouts?" etc.), not narration. Both fixed below.

## Slide-by-slide

### Slide 1 — Title slide

- **Before (Title 1)**: `GitHub Copilot for Almost Everyone`
- **After (Title 1)**: `Claude Code and Large-Context Reasoning`
- **Before (Notes)**: Template-review Q&A scratch notes ("How much flexibility am I allowed with these slide layouts?...") — would have been embarrassing if presenter view shared the screen.
- **After (Notes)**: Opening narration in Tim's voice. Welcomes the class, names the current model lineup (Opus 4.7 / Sonnet 4.6 / Haiku 4.5), explicitly flags `claude-opus-4-20250514` and `claude-sonnet-4-20250514` as deprecated and retiring 2026-06-15, and sets house rules for Q&A.
- **Reason**: course-branding mismatch and unsuitable speaker-notes content. The model-deprecation callout is preventive — if a learner asks about old IDs, the narration is ready.

## Slides reviewed but unchanged (and why)

| Slide | Title | Why unchanged |
|------|------|---------------|
| 2 | Tim Warner | Bio. No dated technical claims. |
| 3 | Course Flow (Central Time Zone) | Segments labeled "Foundations / MCP / Agents / Skills" — already reflects post-merge Skills terminology. Schedule and segment names are correct. |
| 4 | Course materials | Vanity URL only. |
| 5–8 | Session Recording + Badge | Title-only over image. No technical text to refresh. |
| 9 | Questions? | Q&A logistics only. |
| 10–32 | (image-only teaching slides) | Title placeholder is a single space. All content is in PICTURE shapes. No editable text. **Out of scope for a text refresh.** |
| 33 | Thank you! | Closing slide. No technical claims. |

## Ground-truth facts pinned for tomorrow (reference, not changes)

Recorded here so the speaker has the canonical list in front of them and the changelog can be diffed against future refreshes.

- **Opus 4.7**: `claude-opus-4-7` — 1M context, 128k max output, $5/$25 per MTok, Jan 2026 cutoff
- **Sonnet 4.6**: `claude-sonnet-4-6` — 1M context, 64k max output, $3/$15 per MTok, Aug 2025 cutoff
- **Haiku 4.5**: `claude-haiku-4-5-20251001` (alias `claude-haiku-4-5`) — 200k context, 64k max output, $1/$5 per MTok, Feb 2025 cutoff
- **Deprecated, retiring 2026-06-15**: `claude-sonnet-4-20250514`, `claude-opus-4-20250514`
- **MCP spec**: rev **2025-11-25**. Transports: **stdio** (local) + **Streamable HTTP** (remote). **SSE is retired.** Primitives: tools (model-controlled), resources (app-controlled), prompts (user-controlled).
- **Skills**: "Custom commands have been merged into skills." Skill lives at `.claude/skills/<name>/SKILL.md`. Frontmatter fields: `description`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context: fork`, `agent`, `paths`, `argument-hint`, `arguments`, `hooks`, `shell`.
- **Subagents** (term unchanged): live in `.claude/agents/<name>.md` with frontmatter `name` / `description` / `tools` / `model`. Own context window is the value prop. Session-scoped via `claude --agents '{...}'`.

## Verification

- File saved to original path: `C:\github\claude-code\warner-claude-code.pptx`
- Re-opened with python-pptx after save: slide count = 33 (unchanged)
- Layouts, masters, brand colors, fonts, image positions: untouched (only run text rewritten on slide 1)
- No slides added, removed, or reordered
