# Architecture rules

- Keep Stream scheduling deterministic and index-based; six spiral arms distribute indices arm-by-arm so persisted history remains compatible.
- Keep Stream presentation read-only and live from existing topic/chat queries; it must not create separate conversation state.
- Gutefrage signup attribution (post_id/UTM/is_test) is stored on the signup row and gf_signup_submitted/confirmed are captured server-side, so attribution survives browser changes and retries never double-count.
- The /sim replay runs deterministically at 120× speed from a fixed loop epoch, writes backdated events server-side, and catches up on page views (no cron), so every visitor sees the identical state.
- Keep opinion-difference ratings independent from chat respect ratings; simulated opinion-list ratings create clusters while chat ratings only represent respect.
- Scope Wedium discussion visuals through presentation context and semantic CSS tokens; reuse the existing graph and interactions instead of maintaining a separate renderer.
- Display simulation progress from the last successful replay response, not a running client clock, so the indicator cannot advance beyond confirmed replay state.
- Feed replay and user activity through one deduplicated graph-animation event path, so visual behavior cannot diverge between simulation and live use.
- Generate reading pauses in presentation seconds mapped to replay time, and serialize queued message flights per chat so catch-up batches cannot animate both sides simultaneously.
- Resolve /go from the shared event phase and remount the existing discussion when switching from interactive simulation to the real topic, so preview conversations cannot leak into event state.
- Measure graph text bubbles from rendered text before sizing their SVG container, so three-line text fits without oversized empty boxes.
- Embed the existing /go simulation in same-origin portrait iframes with explicit language and presentation parameters; preload after the first landing scroll and reveal interaction chrome via origin/source-validated parent messages, keeping one renderer and the simulation topic isolated.
- Replay datasets (AI simulation, real August discussion) share one renderer and one sim-replay function, separated only by topic setting, persona slot range, cursor and lease, so a new dataset never needs a second player.
