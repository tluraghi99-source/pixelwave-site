# Italian site texts — design

## Goal
Replace every English user-facing text on pixelwave.it with Italian that expresses the same ideas (not a literal translation).

## Decisions (approved by the user)
- **Languages:** Italian only (no IT/EN switch). English may be added later.
- **Tone:** "tu", direct and sober (e.g. "Hai una wave in mente?").
- **Labels:** translated where natural (Lavori, Servizi, Lavora con noi, Contatti; services Video, Foto, Branding, Web Design, Social, Eventi). Kept in English by choice: slogan "Your Vision, Our Wave" (also in footer and SEO titles), "Let's chat", "Let's talk"; "Recent waves." → "Le nostre waves."
- **Legal links:** "Informativa sulla privacy" / "Informativa sui cookie"; the two pages themselves are rewritten in Italian last.
- **Work categories:** Photo→Foto and Events→Eventi are renamed in the CMS and the site at the same moment.
- **Notification emails** sent by the CMS become Italian too.
- **Briefly considered and set aside:** an IT/EN switch in the menu. Italian only for now; English may come later (likely under /en).
- **Legal pages** (Privacy Policy, Cookie Policy): separate job, done last, with the studio's real data.
- **URLs (done):** Italian — /lavori, /lavori/<slug>, /contatti, /lavora-con-noi; /studio, /privacy, /cookies unchanged. Old /work, /work/<slug>, /contact, /careers redirect (React Router + 301 in public/.htaccess). Query params: ?categoria= and ?vista=categoria|cliente (the old ?category= / ?mode= still work). Paths live in src/lib/routes.ts.
- **Workflow (approach C):** review document of every text (EN → IT, editable) → user approves/edits → apply to code and CMS in one pass → check layout page by page on desktop and mobile (Italian runs ~20–30% longer: giant headlines, buttons, ticker, labels).

## Scope
1. Texts in code: header/menu, home, services (`src/data/services.ts`), studio, work, project page, contact, careers, 404, cookie banner, footer.
2. SEO: `index.html` and per-page titles/descriptions (`usePageMeta`), `lang="it"`, `og:locale it_IT`.
3. CMS content: project texts (11), team roles, project tags, work categories (Photo→Foto, Events→Eventi).
4. Later: Privacy/Cookie pages; internal notification emails sent by the CMS (language to be decided).

## Constraints / risks
- Work categories are matched by name between the site (`SERVICES`) and the CMS, and drive `?category=`: renaming must be done in both places at the same time.
- CMS edits need an API token created by the user and kept in a local, git-ignored file; it is never pasted in chat.
- Review document: `~/Desktop/pixelwave-testi-sito-italiano.html` (generated; edits stored in the browser's localStorage and exported with "Copia le mie modifiche").
