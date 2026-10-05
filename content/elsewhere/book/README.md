# Elsewhere / BOOK

Status: production content contract. The build and renderer are wired; BOOK records are published only after the real title, edition, and authored orientation fields are complete.

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

## Source layout

Each published BOOK record lives at:

```text
content/elsewhere/book/<id>/
├── record.json
├── body.en.html
└── body.zh.html    # optional authored Chinese version
```

`body.en.html` is required. When `body.zh.html` exists, the build combines both authored bodies into one record page with an ENGLISH / 中文 switcher.

The build validates the record, adds it under `elsewhere:e02`, and emits:

```text
dist/records/elsewhere-<id>.html
dist/data/elsewhere-books.json
```

The static record page prerenders the authored body content. Runtime archive body stripping therefore does not remove published BOOK prose in either language.

Source preview uses `record.html?ref=elsewhere:<id>`. Production collection and Atlas links use the emitted static record page.

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

## First published record

BOOK 001 is *The Glory and the Dream: A Narrative History of America, 1932–1972* by William Manchester, first published in 1974.

Published source:

```text
content/elsewhere/book/book-001/
├── record.json
├── body.en.html
└── body.zh.html
```

The record uses the 1974 first-edition Little, Brown text, read in English. Its primary SHIFT is FRAME: from asking why the United States became powerful to asking how a society repeatedly experiencing crisis, conflict, error, and distrust can still keep operating, repairing, and recovering order.

The production record is bilingual. English is the default rendered reading language; 中文 preserves the authored Chinese version of the same reflection.
