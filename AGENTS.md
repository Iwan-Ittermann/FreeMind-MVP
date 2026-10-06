# Architecture rules

- Keep Stream scheduling deterministic and index-based; six spiral arms distribute indices arm-by-arm so persisted history remains compatible.
- Keep Stream presentation read-only and live from existing topic/chat queries; it must not create separate conversation state.
- Gutefrage signup attribution (post_id/UTM/is_test) is stored on the signup row and gf_signup_submitted/confirmed are captured server-side, so attribution survives browser changes and retries never double-count.
- The /sim replay runs deterministically at 60× speed from a fixed loop epoch, writes backdated events server-side, and catches up on page views (no cron), so every visitor sees the identical state.
- Scope Wedium discussion visuals through presentation context and semantic CSS tokens; reuse the existing graph and interactions instead of maintaining a separate renderer.
- Display simulation progress from the last successful replay response, not a running client clock, so the indicator cannot advance beyond confirmed replay state.
