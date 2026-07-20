# Testing

Test expectations for Python GenAI code in this repo. GenAI adds a second axis: you test the **code** deterministically and you evaluate the **model behavior** statistically. Both gate a ship.

## Two kinds of checks

| Axis | Question | Tool | Determinism |
| --- | --- | --- | --- |
| Code tests | Does the plumbing work? | **pytest** | Deterministic; must pass 100% |
| Evals | Is the model output good enough? | eval suite (see [[genai-prompt-eval]]) | Statistical; must clear a threshold |

Do not confuse them. A green pytest run with a failing eval is not shippable, and vice versa.

## Code tests (pytest)

- **Mock the model call.** Unit tests must not hit a live endpoint. Patch the client so tests are fast, free, and offline. Assert on how your code assembles the prompt and handles the response, not on the model's wording.
- Test the **failure paths**: empty input, oversized input, a timeout, a malformed model response, a missing env var. Error handling is the part that breaks in production.
- Keep tests isolated. No shared mutable state, no ordering dependency, no network.
- Run with **uv**: `uv run pytest`.

```python
# Assert prompt assembly and error handling, with the model mocked.
def test_summarize_rejects_empty_input():
    with pytest.raises(ValueError):
        summarize("")

def test_summarize_builds_expected_messages(mock_client):
    summarize("field report text")
    sent = mock_client.chat.completions.create.call_args.kwargs["messages"]
    assert sent[-1]["role"] == "user"
```

## Evals (model behavior)

- Maintain a versioned set of **eval cases** (input plus pass criteria) as data, not code. A prompt or model change reruns the suite.
- Score the dimensions in [[genai-prompt-eval]]: groundedness, relevance, coherence, safety.
- A prompt change that drops any dimension below its threshold is a **regression** and blocks the deploy, the same way a failing pytest does.

## Coverage

- Aim for meaningful coverage of the code axis (branches and error paths), not a vanity percentage over trivial getters.
- Every bug fix lands with a test that fails before the fix and passes after.

## CI gate

The pipeline runs `uv run pytest` and the eval suite. Both must be green before promotion to a shared environment. See [[azure-deployment]] for where the gate sits in the deploy flow.

## Related

- [[genai-prompt-eval]] - the evaluation dimensions and runner.
- [[python-genai]] - the code under test.
