---
description: Run the prompt-eval suite and report scores against the ship thresholds.
argument-hint: "[path to eval_cases.jsonl, optional]"
---

# /eval-prompts

Score the current GenAI app's outputs before it ships. Eval cases file: **$1** (default to the `genai-prompt-eval` skill's `resources/templates/eval_cases.jsonl` if empty).

1. Invoke the **`genai-prompt-eval`** skill.
2. Load the eval cases from **$1**, run each through the model, and score the four dimensions: **groundedness**, **relevance**, **coherence**, **safety**.
3. Report a per-dimension score, the pass threshold, and a clear **PASS** or **FAIL** per dimension. Do not signal pass/fail by color alone; use the words.
4. On any **FAIL**, name the specific cases that dragged the score down so the prompt or grounding can be fixed. This is the same gate `/deploy-genai` runs before it ships. See [[testing]] and [[genai-prompt-eval]].
