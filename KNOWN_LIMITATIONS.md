# FakeHall — known limitations

1. **The source is the anchor, not the truth.** FakeHall proves which
   exhibit contradicts the stated public source (e.g. a Wikipedia page)
   as fetched by the validators. It does not prove that the source page
   itself is archaeologically or historically true.
2. **Votes are masked, not secret.** `get_round` / `get_all_rounds`
   return `SEALED_UNTIL_JUDGED` for detective choices until a round is
   JUDGED, but raw transaction calldata is visible to anyone reading
   the chain directly.
3. **Salt custody.** The forger's commitment hides the choice, but if
   the forger loses the salt, `reveal_forgery` cannot be called. The
   detective archive exit (`archive_judged_round`) still lets the round
   reach the gallery; a later `supplement_forger_reveal` can record the
   witness without changing any score.
4. **Source drift.** Public pages change. A quote that was verbatim
   when a round was judged may drift if the page is edited; the
   fail-closed fetch (primary + backup source) and retry are the
   mitigation, never a loosened quote check.
5. **No money moves.** Points only: no payable, no stakes, no
   withdraw. Scores are reputational.
6. **No time gates.** There are no deadlines or challenge windows; a
   round only moves when someone acts. A round whose participants all
   walk away stays VOTING until someone closes or resolves it.
