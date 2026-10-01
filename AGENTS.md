# Architecture rules

- Keep Stream scheduling deterministic and index-based; six spiral arms distribute indices arm-by-arm so persisted history remains compatible.- Gutefrage signup attribution (post_id/UTM/is_test) is stored on the signup row and gf_signup_submitted/confirmed are captured server-side, so attribution survives browser changes and retries never double-count.
