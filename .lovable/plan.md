## What's causing the warning

Not SSL — SSL is about the web (HTTPS). Email trust runs on three DNS-based signals: **SPF**, **DKIM**, and **DMARC**. Hotmail/Outlook shows the "Wir können nicht überprüfen, ob diese E-Mail vom Absender stammt" banner when at least one of these fails **alignment** with the visible `From:` domain.

In our current setup:
- Emails are sent through the delegated subdomain `notify.freemind.chat` (that's where SPF/DKIM records live and are signed).
- But the visible `From:` header is `noreply@freemind.chat` (root domain), because `FROM_DOMAIN = "freemind.chat"` in `send-transactional-email/index.ts`.

Outlook checks whether the DKIM signing domain and the SPF `MAIL FROM` domain **align** with the visible `From:` domain. `notify.freemind.chat` vs `freemind.chat` is a subdomain — that only aligns under DMARC's **relaxed** mode, and only if a DMARC record exists at `freemind.chat`. If there's no `_dmarc.freemind.chat` TXT record (or it's set to `aspf=s`/`adkim=s` strict), Outlook treats the mail as unauthenticated and shows the warning.

## Plan

1. **Diagnose the exact failure**
   - Check current status of the sender domain (SPF/DKIM records on `notify.freemind.chat`, and whether a `_dmarc` TXT record exists on `freemind.chat`).
   - Send a fresh confirmation to a Gmail address and read the raw headers (`Authentication-Results:`) to see which of SPF / DKIM / DMARC actually says `pass` / `fail` / `none`. This tells us precisely which fix is needed instead of guessing.

2. **Add a DMARC record at the root domain** (most likely the missing piece)
   Add a TXT record at `_dmarc.freemind.chat`:
   ```
   v=DMARC1; p=none; rua=mailto:postmaster@freemind.chat; adkim=r; aspf=r
   ```
   - `p=none` = monitor only, no mail gets rejected while we tune.
   - `adkim=r; aspf=r` = relaxed alignment, so `notify.freemind.chat` counts as aligned with `freemind.chat`.
   - This alone typically clears the Outlook warning within a few hours of DNS propagation.

3. **If headers show DKIM/SPF are actually failing** (not just DMARC missing), the real fix is to align the visible `From:` with the signing domain. Two options:
   - **A (recommended, invisible to users if root DMARC is added):** keep `From: noreply@freemind.chat` and rely on step 2.
   - **B:** change `FROM_DOMAIN` to `notify.freemind.chat` so the visible From matches the DKIM/SPF domain exactly (strict alignment, works even without a root DMARC record). Downside: users see `noreply@notify.freemind.chat`, which is slightly less clean.

4. **Warm-up + reputation**
   - New sender subdomains are treated with suspicion by Outlook for the first ~1–2 weeks regardless of DNS. Even with perfect SPF/DKIM/DMARC, expect occasional soft warnings during warm-up. Sending small, consistent, non-spammy volume helps.
   - Optional later: raise DMARC to `p=quarantine` once we confirm 100% pass in the `rua` reports.

5. **What we won't do**
   - No SSL/TLS changes — irrelevant to this warning.
   - No provider switch — Lovable Emails already signs DKIM correctly on the delegated subdomain.
   - No changes to templates/content for this issue.

## Deliverables from me in build mode
- Run the domain status check and (if possible) trigger a test send to inspect headers.
- Tell you the exact DNS record(s) to add at your registrar (DMARC TXT, and — only if diagnosis requires — a `FROM_DOMAIN` code change + redeploy of `send-transactional-email`).
- No user-facing code changes unless step 3B is needed.
