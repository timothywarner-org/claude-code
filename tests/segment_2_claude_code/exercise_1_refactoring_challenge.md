# Exercise 1: Refactoring Legacy Code with Claude Code CLI

## Learning Objectives

By the end of this exercise, you will be able to:

1. Use Claude Code CLI to analyze legacy Python code
2. Identify code smells and anti-patterns with AI assistance
3. Apply systematic refactoring strategies
4. Validate refactored code maintains original behavior
5. Document refactoring decisions for team communication

## Prerequisites

- Claude Code CLI installed and authenticated
- Python 3.9+ installed
- pytest installed (`pip install pytest`)
- Basic understanding of Python classes and functions

## Background

Legacy code often suffers from:

- **God classes**: Classes that do too much
- **Long methods**: Functions with too many responsibilities
- **Magic numbers**: Unexplained numeric literals
- **Poor naming**: Variables and functions with unclear names
- **Missing type hints**: No static type information
- **Lack of tests**: No way to verify behavior during refactoring

Claude Code excels at identifying these issues and suggesting improvements while preserving functionality.

## The Legacy Code

Open `exercise_1_legacy_code.py` to see the code you will refactor. This file contains a
`DataProcessor` class that has grown organically over time and now violates many best practices.

Issues you will address:

1. The class handles file I/O, data transformation, and reporting (SRP violation)
2. Methods are too long and nested
3. No type hints or documentation
4. Magic numbers throughout
5. Poor error handling
6. Duplicate code patterns

## Step-by-Step Instructions

### Step 1: Initial Analysis

Use Claude Code to analyze the legacy code:

```bash
claude "Analyze this Python file for code smells and anti-patterns.
Prioritize issues by severity and suggest a refactoring plan.

$(cat exercise_1_legacy_code.py)"
```

Take note of the issues Claude identifies. Compare them to your own observations.

### Step 2: Create a Test Harness

Before refactoring, ensure you can verify the code still works. Create a simple test file:

```bash
claude "Generate pytest tests for the DataProcessor class that capture its current behavior.
Focus on the main public methods: process_file() and generate_report().

$(cat exercise_1_legacy_code.py)"
```

Save the generated tests to `test_data_processor.py` and run them:

```bash
pytest test_data_processor.py -v
```

### Step 3: Extract Configuration

Start refactoring by extracting magic numbers and configuration:

```bash
claude "Refactor this code to extract all magic numbers and configuration values
into a dataclass or typed dictionary. Show me the before/after diff.

$(cat exercise_1_legacy_code.py)"
```

### Step 4: Split the God Class

Break the `DataProcessor` into focused classes:

```bash
claude "Split this class following the Single Responsibility Principle.
Create separate classes for:
1. File reading/writing
2. Data transformation
3. Report generation

Maintain backward compatibility with a facade class.

$(cat exercise_1_legacy_code.py)"
```

### Step 5: Add Type Hints

Enhance the code with proper type annotations:

```bash
claude "Add comprehensive type hints to all functions and classes.
Use modern Python typing (3.10+) with Optional, Union, and TypedDict where appropriate.

$(cat your_refactored_code.py)"
```

### Step 6: Improve Error Handling

Replace bare try/except blocks with proper error handling:

```bash
claude "Improve error handling in this code:
1. Create custom exception classes
2. Add specific exception handling
3. Include helpful error messages
4. Add logging for debugging

$(cat your_refactored_code.py)"
```

### Step 7: Run Tests and Verify

Ensure all tests still pass after refactoring:

```bash
pytest test_data_processor.py -v

# Also run type checking
mypy your_refactored_code.py
```

### Step 8: Compare with Expected Output

Review `exercise_1_expected_output.py` to see a well-refactored version.
Compare your solution and note any differences in approach.

## Expected Outcomes

After completing this exercise, you should have:

1. A refactored codebase with:
   - Separate classes for distinct responsibilities
   - Comprehensive type hints
   - Proper error handling
   - No magic numbers
   - Clear documentation

2. A test suite that verifies behavior

3. Understanding of how to use Claude Code for refactoring workflows

## Success Criteria

Your refactored code should:

- [ ] Pass all original tests (behavior preserved)
- [ ] Pass mypy type checking with no errors
- [ ] Have no functions longer than 20 lines
- [ ] Have no classes with more than 5 public methods
- [ ] Include docstrings for all public methods
- [ ] Have zero magic numbers in the main code

## Bonus Challenges

### Challenge 1: Performance Analysis

Use Claude Code to identify performance bottlenecks:

```bash
claude "Analyze this code for performance issues. What could be optimized?
Consider memory usage, algorithmic complexity, and I/O patterns."
```

### Challenge 2: Add Async Support

Convert the file I/O operations to use async/await:

```bash
claude "Convert the file reading/writing operations to async.
Use aiofiles for async file I/O. Maintain sync methods for backward compatibility."
```

### Challenge 3: Create a Plugin Architecture

Design an extensible architecture for data transformations:

```bash
claude "Design a plugin system that allows adding new data transformations
without modifying the core code. Use Python's ABC and plugin discovery."
```

## Common Pitfalls

1. **Refactoring without tests**: Always create a test harness first
2. **Big bang refactoring**: Make small, incremental changes
3. **Losing functionality**: Verify behavior after each step
4. **Over-engineering**: Not everything needs to be abstracted
5. **Ignoring existing patterns**: Work with the codebase, not against it

## Claude Code CLI Tips

Useful commands for refactoring:

```bash
# Get a summary of code structure
claude "Summarize the structure of this codebase: classes, functions, and dependencies."

# Find specific patterns
claude "Find all places where exceptions are caught and ignored silently."

# Generate documentation
claude "Generate docstrings for all public methods in this module."

# Suggest tests
claude "What edge cases should I test for this function?"
```

## Next Steps

Once you have completed this exercise, proceed to Exercise 2: Using Claude Code for PR Review Workflows.
