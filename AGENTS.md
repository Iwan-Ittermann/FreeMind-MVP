# Architecture rules

- Keep Stream scheduling deterministic and index-based; six spiral arms distribute indices arm-by-arm so persisted history remains compatible.
- Keep Stream presentation read-only and live from existing topic/chat queries; it must not create separate conversation state.
- Gutefrage signup attribution (post_id/UTM/is_test) is stored on the signup row and gf_signup_submitted/confirmed are captured server-side, so attribution survives browser changes and retries never double-count.
- The /sim replay is written server-side from a fixed loop epoch with backdated timestamps and caught up on page views (no cron), so every visitor sees the identical discussion state.
