# Elsewhere / BOOK

Status: editorial source draft. This file does not yet feed the production build.

## Position

BOOK is not a review shelf and not a reading log.

A book enters Elsewhere when it changes orientation: the scale of a question, the frame around evidence, the vocabulary available for seeing, or the distance from which later facts are read.

The unit records the change produced by reading. It does not attempt to summarize the book.

## Collection copy

**Eyebrow**

BOOK

**Title**

Books that moved the horizon

**Lede**

Some books do not add facts; they change the distance from which facts are seen.

**Register**

- CHANGE — FRAME / SCALE / VOCABULARY
- TRACE — BOOK / MARGINS / RETURN
- KEPT WHEN — A BOOK CHANGES HOW LATER QUESTIONS ARE ASKED OR SEEN

**Entry condition**

The frame changes, not only the facts.

Keep a book when it alters scale, distance, vocabulary, or the questions that survive it.

## Book record

Each book record uses the same six-part structure.

### 01 / BIBLIOGRAPHY

Record only stable bibliographic facts.

- TITLE
- AUTHOR
- FIRST PUBLISHED
- EDITION READ, when edition matters
- LANGUAGE READ, when translation matters

### 02 / BEFORE

State the question or assumption carried into the book.

Do not manufacture a problem after reading to make the record look coherent.

### 03 / SHIFT

Name what moved.

Use one primary shift when possible:

- FRAME — the boundary around the problem changed.
- SCALE — the relevant spatial, temporal, or conceptual scale changed.
- DISTANCE — the position from which evidence is judged changed.
- VOCABULARY — a new distinction made something previously vague legible.
- METHOD — the way of asking or testing changed.

### 04 / AFTER

Record what became newly visible after the shift.

This section should connect the reading to later observation, research, design, or judgment.

### 05 / TRACE

Record where the book reappears later.

Possible traces include a Field Note, Lab instrument, Atlas relation, place observation, another book, or a changed working habit.

A trace is an authored relation. It is not proof of influence or causation.

### 06 / RETURN

State why the book remains worth returning to.

Prefer an unresolved tension, durable question, or productive limit over a recommendation.

## Record header vocabulary

- KIND — BOOK
- FIELD — READING
- OBJECT — the book title
- METHOD — CLOSE READING / MARGINS / RETURN
- SCALE — RECORD
- STATUS — OPEN RECORD

## Writing rules

1. Do not write a conventional plot or chapter summary.
2. Separate the author's claim from GeoGeek's later use of that claim.
3. Verify author, publication year, edition, and translator before publication.
4. Attach page numbers to specific textual claims when an edition is known.
5. Keep quotations short and necessary. Prefer paraphrase plus a precise citation.
6. Do not turn personal influence into a claim about the author's intent.
7. Do not assign ratings, scores, or generic recommendation labels.
8. Keep one record centered on one durable change of orientation.

## Minimum publishable record

A BOOK record is publishable only when BIBLIOGRAPHY, BEFORE, SHIFT, AFTER, and RETURN are complete.

TRACE can remain empty until a later relation actually exists.

## Data shape

```json
{
  "ref": "elsewhere:book-001",
  "kind": "elsewhere",
  "id": "book-001",
  "data": {
    "unit": "book",
    "status": "open",
    "firstPublished": "",
    "editionRead": "",
    "languageRead": ""
  },
  "text": {
    "en": {
      "kind": "Book",
      "title": "",
      "author": "",
      "subtitle": "",
      "meta": "close reading / margins / return",
      "before": "",
      "shift": {
        "type": "frame",
        "text": ""
      },
      "after": "",
      "return": ""
    }
  },
  "relations": {
    "trace": []
  }
}
```

## First content dependency

The first book has not been selected yet.

Do not publish a fabricated seed record. The next content step is to supply one real title and edition, then complete the six-part record against the actual text.
