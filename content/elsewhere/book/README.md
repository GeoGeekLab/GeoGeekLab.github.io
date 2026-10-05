# Elsewhere / BOOK

Status: build and renderer integrated.

BOOK records in this directory feed the production Elsewhere collection.

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

## Source layout

Each published book is one directory.

```text
content/elsewhere/book/
  README.md
  book-001/
    record.json
    body.en.html
  book-002/
    record.json
    body.en.html
```

The directory name must match `record.id`.

The record reference must be `elsewhere:<record.id>`.

The build assigns `elsewhere:e02` as the parent entry when `data.parentRef` is omitted.

`data.order` is optional. Lower values appear first. Records without an order sort by ID after ordered records.

## Build behavior

`scripts/build.legacy.mjs` reads all BOOK directories during the normal site build.

The build performs these actions:

1. It validates required BOOK metadata and orientation fields.
2. It loads `body.en.html` into the runtime archive payload.
3. It adds BOOK records to `GEOGEEK_DATA.en.elsewhere`.
4. It emits one static page at `records/elsewhere-<id>.html`.
5. It emits `data/elsewhere-books.json` for inspection and downstream use.
6. It registers BOOK as a non-spatial `book / Reading` object in Atlas.

A validation failure stops the build.

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

## Required build fields

The build requires these values before a BOOK can ship:

- `kind = elsewhere`
- `data.unit = book`
- `data.firstPublished`
- `text.en.title`
- `text.en.author`
- `text.en.before`
- `text.en.shift.type`
- `text.en.shift.text`
- `text.en.after`
- `text.en.return`
- `body.en.html`

`data.firstPublished` must contain a four-digit year. Atlas uses that year for the BOOK record's time position.

`editionRead` and `languageRead` remain optional because they are only necessary when edition or translation affects interpretation.

## Record header vocabulary

- KIND — BOOK
- FIELD — READING
- OBJECT — the book title
- METHOD — CLOSE READING / MARGINS / RETURN
- SCALE — RECORD
- STATUS — OPEN RECORD

## Recommended body markup

Use the existing BOOK section classes so the renderer preserves one visual grammar.

```html
<section class="book-record-section" data-book-section="bibliography">
  <div class="book-record-section-label">01 / BIBLIOGRAPHY</div>
  <dl class="book-record-bibliography">
    <div><dt>TITLE</dt><dd>...</dd></div>
    <div><dt>AUTHOR</dt><dd>...</dd></div>
    <div><dt>FIRST PUBLISHED</dt><dd>...</dd></div>
  </dl>
</section>

<section class="book-record-section" data-book-section="before">
  <div class="book-record-section-label">02 / BEFORE</div>
  <div>...</div>
</section>

<section class="book-record-section" data-book-section="shift">
  <div class="book-record-section-label">03 / SHIFT · FRAME</div>
  <div>...</div>
</section>

<section class="book-record-section" data-book-section="after">
  <div class="book-record-section-label">04 / AFTER</div>
  <div>...</div>
</section>

<section class="book-record-section" data-book-section="trace">
  <div class="book-record-section-label">05 / TRACE</div>
  <div>...</div>
</section>

<section class="book-record-section" data-book-section="return">
  <div class="book-record-section-label">06 / RETURN</div>
  <div>...</div>
</section>
```

TRACE may be empty until a later relation actually exists.

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
    "parentRef": "elsewhere:e02",
    "order": 1,
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
