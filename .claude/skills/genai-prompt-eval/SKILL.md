---
name: genai-prompt-eval
description: Score a Python generative-AI app's outputs on groundedness, relevance, coherence, and safety before it ships. Use when building a prompt-eval harness, writing eval cases for a GenAI feature, gating a deploy on quality thresholds, or measuring whether model answers stay grounded and on-topic. Triggers on "evaluate my prompts", "run evals", "groundedness score", "eval cases", "quality gate for the model", "is the answer grounded".
allowed-tools: Read, Glob, Grep, Bash, Edit, Write
---

# Score GenAI outputs before shipping

This skill measures whether a generative-AI feature produces answers that are **grounded**, **relevant**, **coherent**, and **safe**. It runs a set of eval cases through the model, scores each output on those four dimensions, and reports pass or fail against thresholds. Pair it with the `azure-ai-deploy` skill: evals are Gate 1 of that deploy checklist.

## When to reach for this

- A GenAI feature is changing and you need a regression signal on answer quality.
- A deploy gate requires proof that outputs meet a quality bar.
- You want a repeatable eval corpus that reflects real enterprise questions, not toy prompts.

## Workflow

### 1. Read the dimensions

Read `resources/references/EVAL-DIMENSIONS.md`. It defines groundedness, relevance, coherence, and safety, states what each one measures, and gives a pass signal for each.

### 2. Build the eval corpus

Start from `resources/templates/eval_cases.jsonl`. Each line is one case: an `input` prompt, optional `context` the answer must stay grounded to, and `expected_criteria` describing a passing answer. Add cases that mirror the questions real users send.

### 3. Run the harness

```bash
uv run python ${CLAUDE_SKILL_DIR}/resources/scripts/run_eval.py \
  --cases ${CLAUDE_SKILL_DIR}/resources/templates/eval_cases.jsonl \
  --threshold 0.8
```

The script loads the cases, calls the model for each, scores the output on the four dimensions, prints a per-case and aggregate report, and exits non-zero when the aggregate score falls below the threshold. That non-zero exit fails a CI or deploy step.

### 4. Read the report and act

- Cases below threshold name the failing dimension. Fix the prompt, the retrieval context, or the guardrail, then re-run.
- Record the aggregate score as the new baseline so the next run detects regressions.

## Conventions

- **uv** manages Python, not pip. Run scripts with `uv run`.
- **No hardcoded secrets.** The scoring model client reads its endpoint and deployment from env vars.
- **Realistic cases only.** Eval inputs are enterprise scenarios, never placeholder prompts.
- **Deterministic scoring where possible.** Prefer a low temperature on any model-graded dimension so scores are stable across runs.
