"""Prompt-eval harness for a generative-AI feature.

Loads eval cases from a JSONL file, calls the model under test for each case,
scores the output on groundedness, relevance, coherence, and safety, then
reports per-case and aggregate scores. Exits non-zero when the aggregate score
falls below the threshold, so a CI or deploy step fails on a quality regression.

The scoring model client reads its endpoint and deployment from the environment
(AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_DEPLOYMENT) and authenticates keyless via
DefaultAzureCredential. No key is stored in code.

This file is a skeleton: build_client, call_model, and score_output carry the
integration points. The load, aggregate, and reporting logic is complete.

Run with uv:
    uv run python run_eval.py --cases eval_cases.jsonl --threshold 0.8
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

# The four scored dimensions. Safety carries a hard floor of 1.0.
DIMENSIONS: tuple[str, ...] = ("groundedness", "relevance", "coherence", "safety")


@dataclass
class EvalCase:
    """One eval case loaded from the JSONL corpus."""

    id: str
    input: str
    expected_criteria: str
    context: str = ""


@dataclass
class CaseResult:
    """Scores for one case plus the model output that produced them."""

    case_id: str
    output: str
    scores: dict[str, float] = field(default_factory=dict)

    @property
    def mean(self) -> float:
        """Mean of the dimension scores, or 0.0 when no scores are present."""
        return sum(self.scores.values()) / len(self.scores) if self.scores else 0.0


def load_cases(path: Path) -> list[EvalCase]:
    """Load eval cases from a JSONL file.

    Args:
        path: Path to a JSONL file, one case object per line.

    Returns:
        The parsed eval cases.

    Raises:
        FileNotFoundError: if the path does not exist.
        ValueError: if a line is not valid JSON or is missing a required field.
    """
    if not path.is_file():
        raise FileNotFoundError(f"Eval cases file not found: {path}")

    cases: list[EvalCase] = []
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"Line {line_number} is not valid JSON: {error}") from error
        try:
            cases.append(
                EvalCase(
                    id=record["id"],
                    input=record["input"],
                    expected_criteria=record["expected_criteria"],
                    context=record.get("context", ""),
                )
            )
        except KeyError as missing:
            raise ValueError(f"Line {line_number} is missing required field {missing}") from missing
    return cases


def build_client():
    """Return a keyless Azure OpenAI client for the scoring model.

    Reads AZURE_OPENAI_ENDPOINT from the environment and authenticates with a
    Microsoft Entra ID token from DefaultAzureCredential. No key is used.

    Raises:
        KeyError: if AZURE_OPENAI_ENDPOINT is not set.
    """
    from azure.identity import DefaultAzureCredential, get_bearer_token_provider
    from openai import AzureOpenAI

    token_provider = get_bearer_token_provider(
        DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
    )
    return AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        azure_ad_token_provider=token_provider,
        api_version="2024-05-01-preview",
    )


def call_model(client, case: EvalCase) -> str:
    """Call the model under test with the case input and context.

    Args:
        client: A configured Azure OpenAI client.
        case: The eval case to run.

    Returns:
        The model's answer text.
    """
    messages = []
    if case.context:
        # Supply retrieval context so groundedness can be scored against it.
        messages.append({"role": "system", "content": f"Use only this context:\n{case.context}"})
    messages.append({"role": "user", "content": case.input})

    response = client.chat.completions.create(
        model=os.environ["AZURE_OPENAI_DEPLOYMENT"],
        messages=messages,
        temperature=0.0,
    )
    return response.choices[0].message.content or ""


def score_output(client, case: EvalCase, output: str) -> dict[str, float]:
    """Score one model output on the four dimensions.

    Integration point: wire a model-graded rubric or Azure AI Content Safety
    here. Each dimension returns 0.0 to 1.0. Safety should map a content-safety
    severity band, where higher means safer.

    Args:
        client: The scoring client (a grader model or content-safety client).
        case: The eval case, including expected_criteria and any context.
        output: The model output to score.

    Returns:
        A score per dimension in DIMENSIONS.
    """
    # Skeleton: return a neutral placeholder score per dimension until the
    # grader is wired. Replace with real rubric or content-safety calls.
    _ = (client, case, output)
    return {dimension: 0.0 for dimension in DIMENSIONS}


def run(cases: list[EvalCase], threshold: float) -> tuple[list[CaseResult], float]:
    """Run every case and return per-case results plus the aggregate mean.

    Args:
        cases: The eval cases to run.
        threshold: The aggregate pass threshold, used by the caller for exit code.

    Returns:
        A tuple of the per-case results and the aggregate mean score.
    """
    _ = threshold  # Threshold is applied by the caller against the aggregate.
    client = build_client()
    results: list[CaseResult] = []
    for case in cases:
        output = call_model(client, case)
        scores = score_output(client, case, output)
        results.append(CaseResult(case_id=case.id, output=output, scores=scores))

    aggregate = sum(result.mean for result in results) / len(results) if results else 0.0
    return results, aggregate


def report(results: list[CaseResult], aggregate: float, threshold: float) -> None:
    """Print a per-case and aggregate score report to stdout."""
    print("Per-case scores")
    for result in results:
        detail = ", ".join(f"{name}={value:.2f}" for name, value in result.scores.items())
        print(f"  {result.case_id}: mean={result.mean:.2f} ({detail})")
    verdict = "PASS" if aggregate >= threshold else "FAIL"
    print(f"\nAggregate: {aggregate:.2f} (threshold {threshold:.2f}) -> {verdict}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Score GenAI outputs against eval cases.")
    parser.add_argument("--cases", type=Path, required=True, help="Path to eval_cases.jsonl.")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.8,
        help="Aggregate pass threshold from 0.0 to 1.0 (default 0.8).",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Load cases, run the eval, report, and return a process exit code."""
    args = parse_args(argv if argv is not None else sys.argv[1:])
    try:
        cases = load_cases(args.cases)
        if not cases:
            print("No eval cases found. Nothing to score.", file=sys.stderr)
            return 1
        results, aggregate = run(cases, args.threshold)
    except (FileNotFoundError, ValueError) as error:
        print(f"Eval setup failed: {error}", file=sys.stderr)
        return 1
    except KeyError as missing:
        print(f"Missing required environment variable: {missing}", file=sys.stderr)
        return 1
    except Exception as error:  # noqa: BLE001 - surface any model or scoring failure to the operator
        print(f"Eval run failed: {error}", file=sys.stderr)
        return 1

    report(results, aggregate, args.threshold)
    return 0 if aggregate >= args.threshold else 1


if __name__ == "__main__":
    raise SystemExit(main())
