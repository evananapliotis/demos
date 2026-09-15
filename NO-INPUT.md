# NO-INPUT — the discarded website URLs were not kept

**Run stopped at Step 1.** Nothing was fetched, nothing was scraped, no existing file
was touched. `barber-template/scripts/audit-sites.js` is written and committed but has
**not been run**, because it has nothing to run against.

---

## The short version

`scrape-fresh.js` counts its drops. It does not keep them.

```js
// scrape-fresh.js:581-583
if (verdict.drop) {
  state.drops[verdict.drop] = (state.drops[verdict.drop] ?? 0) + 1;
```

`verdict.drop` for these barbers is the string `'real website'` (line 408). The record —
name, phone, address, and the `websiteUri` that caused the drop — goes out of scope on
the next loop iteration and is never written anywhere. The only trace a completed run
leaves is an integer: how many were dropped for having a real website.

## What I looked for, and where

| # | Looked for | Where | Result |
|---|---|---|---|
| 1 | The drop path retaining a record | `scrape-fresh.js` lines 382-418, 575-590 | Counts only. `state.drops[reason]++`, no record kept |
| 2 | Everything the script writes | `writeFileSync` calls, lines 494-499 | Three files: `barbers-fresh.csv`, `barbers-fresh.json`, `.scrape-fresh-progress.json`. All three contain **kept** leads only |
| 3 | The progress file | `.scrape-fresh-progress.json` | Absent from the working tree, and never committed (0 commits touch it). It would not have helped: it stores `filters`, `townsDone`, `seenIds`, `counts`, `drops` — place IDs and integers, no URLs |
| 4 | A rejects/discards file under another name | `git log --all --diff-filter=D` for any deleted path matching drop / reject / discard / skip / website / excluded | No such file has ever existed in this repository |
| 5 | Any retained raw Places responses | `scrape-fresh.js` for caching of API payloads | None. Responses are parsed in-flight and discarded |
| 6 | Any data file anywhere on the machine | Filesystem sweep, all `*.json` / `*.csv` / `*.ndjson` / `*.txt` modified since 1 Sep, excluding `node_modules`, `.git`, `dist`, caches and system paths | Nothing relevant. The only file on the whole disk containing the string `real website` is `scrape-fresh.js` itself |

## What *is* on disk, and why it is not a substitute

Three files carry website URLs:

| File | Rows | With a URL |
|---|---|---|
| `barber-template/src/data/barbers.json` | 1107 | 303 |
| `barbers-fresh.json` | 1000 | 201 |
| `barbers-150-backup.json` | 150 | 105 |

These are the barbers that were **kept**, not the ones discarded — and that distinction
guts them as an audit target. A shop is only kept if `websiteKind()` judged its URL
*not* to be a real website, so by construction the surviving URLs are social profiles
and booking platforms. In `barbers.json`:

| Kind | Count | Hosts |
|---|---|---|
| Social profile | 241 | facebook.com 148, instagram.com 74, tiktok.com 16 |
| Booking platform | 60 | fresha, booksy, treatwell, nearcut |
| **A real site of their own** | **2** | headmasters.com, and one google.com redirect |

An audit of that population would fire `social-only` 241 times, `booking platform` 60
times, and tell you nothing you cannot already read off the URL string without a single
HTTP request. The checks that carry the actual sales argument — no viewport, not https,
stale copyright, phone mismatch — need a real website to run against, and there are two.

## What would get this running

1. **Re-run `scrape-fresh.js` with drop records retained.** A four-line change: push the
   dropped lead onto an array beside the counter and write it out with the others. That
   recovers exactly the population you want, but it means new Places API calls, which you
   told me not to do tonight — and the key is not on this box anyway.
2. **Point the audit at a list you already have elsewhere.** The script takes
   `--input <file>` and reads either JSON or CSV, so any file with name / phone /
   address / website columns works without further changes.
3. **Audit the 60 booking-platform shops instead**, if the pitch is "your booking link
   is not a website". Different argument, same script, and it would run tonight.

The script is ready for all three. It has been written against no assumption about which
population it gets.
