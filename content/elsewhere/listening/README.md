# Elsewhere / LISTENING

LISTENING records belong to `Elsewhere / Sound as landscape` (`elsewhere:e03`).

## Title contract

The displayed `title` must preserve the work's own language and script: use the original title or the title used for the work's first release. Do not translate a LISTENING title into English, Chinese, or another site language for display.

When the source title cannot be verified, do not invent or translate one. Keep `title` empty, mark the record `titleStatus: "pending-source-verification"`, and identify the item by its source identifier until the original/first-release title is verified.

For a verified title, record `titleLanguage` and `titleForm` (`original` or `first-release`) alongside the title. Romanization or translation may be added later as secondary metadata, never as the primary title.

## Current source data

Runtime LISTENING metadata is stored in `site/data/elsewhere-listening.json`. Each record receives a stable `listening-NNN` id and `elsewhere:listening-NNN` ref. External media should be represented by provider identifiers and a canonical source URL rather than copied media files.
