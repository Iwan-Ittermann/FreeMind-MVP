Plan:

1. Fix the bottom-panel state source so it is reliably topic-specific:
  - Stop relying only on `activeData.opinions.find(authorId === user.id)` for the visible panel decision.
  - Add an explicit “current user has an opinion in this active topic” check that is tied to `activeTopicId` and waits until auth/topic data are loaded.
  - Until that check is known, do not show the “Tippe auf einen Punkt …” hint.
2. Make the add-opinion form the default when the user has no opinion for the current topic:
  - If the active user has no opinion for the active topic, always render the add-opinion form.
  - When user selects a nodes, show the opinion information panel above the add opinion form. 
  - Show the “Tippe auf einen Punkt im Auge …” hint only when the user definitely has an own opinion for that exact topic and no node is selected.
3. Make the tour highlight impossible to miss:
  - Add a stronger visual highlight to the add-opinion form during tour step 3: prominent ring/glow plus a small lifted z-index so it is not visually hidden behind the tour card.
  - Add a stable marker/data attribute to the form wrapper so it is clear what element is being targeted.
  - Keep the form interactive while highlighted.
4. Verify the exact reload scenario:
  - Test `/tt/00000000-0000-0000-0000-000000000001` and another topic such as “Was ist das größte Problem” after page reload.
  - Confirm: users without an opinion see the add-opinion form, not the hint.
  - Confirm: users with an opinion see the hint only after their opinion exists for that active topic.
  - Confirm: tour step 3 highlights the add-opinion form.