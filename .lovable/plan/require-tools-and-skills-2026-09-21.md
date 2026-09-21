# Require Tools and Skills

## Changes

- Remove the Yes/No gateway questions from **Tools & Platforms Used** and **Skills & Core Competencies** in both the application wizard and dashboard editor.
- Open each section directly on its entry form, while keeping the existing tool suggestions, proficiency controls, skill categories, search, and selection controls.
- Add these required instructions prominently near the top of their respective sections:
  - **Tools and Platforms Used — Required:** Please indicate the tools and platforms you have experience using. Providing accurate and relevant information helps us properly assess your profile and facilitate a faster and more suitable client matching process.
  - **Skills and Core Competencies — Required:** Please indicate your relevant skills and core competencies. Providing accurate and relevant information helps us properly assess your profile and facilitate a faster and more suitable client matching process.
- Require at least one tool and at least one skill before the wizard can advance or the dashboard can save those sections.
- Remove the previous “No” skip exceptions for these two sections from dashboard completion and section gating so empty Tools or Skills cannot count as complete.
- Leave the Yes/No behavior for Work Experience, Portfolio, and Certifications unchanged.

## Technical details

- Simplify `ToolsStep` and `SkillsStep` by removing their skip-answer state, question screen, change-answer banner behavior, and wizard skip callback.
- Add Tools and Skills checks to wizard substep validation and use the existing non-empty validators consistently in the dashboard.
- Remove Tools and Skills from persisted skip-answer handling so stale earlier “No” answers cannot bypass the new requirement.
- Verify both wizard and dashboard flows: direct section entry, instruction text, blocked empty submission, successful save/advance after one valid selection, and no regression to the remaining optional sections.
