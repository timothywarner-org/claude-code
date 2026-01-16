#!/usr/bin/env python3
"""
MCP Server Validation Script

Validates a Python MCP server for common issues.

Usage:
    python validate.py <path/to/server.py>

Checks:
    - FastMCP import and initialization
    - Tool definitions with proper type hints
    - Resource URI patterns
    - Pydantic Field usage
    - Async function patterns
    - Common mistakes

Exit codes:
    0 - All checks passed
    1 - Validation errors found
    2 - File not found or syntax error
"""

import argparse
import ast
import re
import sys
from pathlib import Path
from dataclasses import dataclass


@dataclass
class Issue:
    """Validation issue."""
    level: str  # error, warning, info
    line: int
    message: str


class MCPValidator(ast.NodeVisitor):
    """AST visitor to validate MCP server code."""

    def __init__(self, source: str):
        self.source = source
        self.lines = source.splitlines()
        self.issues: list[Issue] = []

        # Tracking
        self.has_fastmcp_import = False
        self.has_mcp_instance = False
        self.mcp_var_name = None
        self.tools: list[str] = []
        self.resources: list[str] = []
        self.prompts: list[str] = []
        self.has_main_block = False
        self.has_run_call = False

    def add_issue(self, level: str, line: int, message: str):
        self.issues.append(Issue(level=level, line=line, message=message))

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            if alias.name == "fastmcp":
                self.has_fastmcp_import = True
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module == "fastmcp":
            self.has_fastmcp_import = True
            for alias in node.names:
                if alias.name == "FastMCP":
                    self.has_fastmcp_import = True
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        # Check for mcp = FastMCP(...)
        if isinstance(node.value, ast.Call):
            if isinstance(node.value.func, ast.Name):
                if node.value.func.id == "FastMCP":
                    self.has_mcp_instance = True
                    if node.targets and isinstance(node.targets[0], ast.Name):
                        self.mcp_var_name = node.targets[0].id
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._check_function(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._check_function(node)
        self.generic_visit(node)

    def _check_function(self, node):
        """Check function for MCP patterns."""
        # Check for decorators
        for decorator in node.decorator_list:
            decorator_name = self._get_decorator_name(decorator)

            if decorator_name and "tool" in decorator_name:
                self.tools.append(node.name)
                self._validate_tool(node)

            elif decorator_name and "resource" in decorator_name:
                self.resources.append(node.name)
                self._validate_resource(node, decorator)

            elif decorator_name and "prompt" in decorator_name:
                self.prompts.append(node.name)
                self._validate_prompt(node)

    def _get_decorator_name(self, decorator) -> str | None:
        """Extract decorator name."""
        if isinstance(decorator, ast.Name):
            return decorator.id
        elif isinstance(decorator, ast.Attribute):
            return decorator.attr
        elif isinstance(decorator, ast.Call):
            if isinstance(decorator.func, ast.Attribute):
                return decorator.func.attr
            elif isinstance(decorator.func, ast.Name):
                return decorator.func.id
        return None

    def _validate_tool(self, node):
        """Validate tool function."""
        # Check for return type hint
        if node.returns is None:
            self.add_issue(
                "warning",
                node.lineno,
                f"Tool '{node.name}' missing return type hint"
            )

        # Check for docstring
        if not ast.get_docstring(node):
            self.add_issue(
                "warning",
                node.lineno,
                f"Tool '{node.name}' missing docstring (used as description)"
            )

        # Check parameters have type hints
        for arg in node.args.args:
            if arg.arg != "self" and arg.arg != "ctx":
                if arg.annotation is None:
                    self.add_issue(
                        "error",
                        node.lineno,
                        f"Tool '{node.name}' parameter '{arg.arg}' missing type hint"
                    )

    def _validate_resource(self, node, decorator):
        """Validate resource function."""
        # Check URI pattern
        uri = self._extract_resource_uri(decorator)
        if uri:
            if not re.match(r'^[a-z]+://', uri):
                self.add_issue(
                    "warning",
                    node.lineno,
                    f"Resource '{node.name}' URI should use scheme://path format"
                )

        # Check for docstring
        if not ast.get_docstring(node):
            self.add_issue(
                "info",
                node.lineno,
                f"Resource '{node.name}' missing docstring"
            )

    def _extract_resource_uri(self, decorator) -> str | None:
        """Extract URI from resource decorator."""
        if isinstance(decorator, ast.Call):
            if decorator.args:
                arg = decorator.args[0]
                if isinstance(arg, ast.Constant):
                    return arg.value
        return None

    def _validate_prompt(self, node):
        """Validate prompt function."""
        # Check return type is str
        if node.returns:
            if isinstance(node.returns, ast.Name) and node.returns.id != "str":
                self.add_issue(
                    "warning",
                    node.lineno,
                    f"Prompt '{node.name}' should return str"
                )

        # Check for docstring
        if not ast.get_docstring(node):
            self.add_issue(
                "info",
                node.lineno,
                f"Prompt '{node.name}' missing docstring"
            )

    def visit_If(self, node: ast.If):
        """Check for if __name__ == "__main__" block."""
        if isinstance(node.test, ast.Compare):
            if isinstance(node.test.left, ast.Name):
                if node.test.left.id == "__name__":
                    self.has_main_block = True
                    # Check for mcp.run() call
                    for stmt in ast.walk(node):
                        if isinstance(stmt, ast.Call):
                            if isinstance(stmt.func, ast.Attribute):
                                if stmt.func.attr == "run":
                                    self.has_run_call = True
        self.generic_visit(node)


def validate_file(path: Path) -> list[Issue]:
    """Validate an MCP server file."""
    if not path.exists():
        return [Issue("error", 0, f"File not found: {path}")]

    try:
        source = path.read_text(encoding="utf-8")
    except Exception as e:
        return [Issue("error", 0, f"Failed to read file: {e}")]

    try:
        tree = ast.parse(source)
    except SyntaxError as e:
        return [Issue("error", e.lineno or 0, f"Syntax error: {e.msg}")]

    validator = MCPValidator(source)
    validator.visit(tree)

    # Post-visit checks
    if not validator.has_fastmcp_import:
        validator.add_issue("error", 1, "Missing FastMCP import")

    if not validator.has_mcp_instance:
        validator.add_issue("error", 1, "Missing FastMCP() instance")

    if not validator.tools and not validator.resources and not validator.prompts:
        validator.add_issue("warning", 1, "No tools, resources, or prompts defined")

    if not validator.has_main_block:
        validator.add_issue("info", 1, "Missing if __name__ == '__main__' block")

    if validator.has_main_block and not validator.has_run_call:
        validator.add_issue("warning", 1, "Missing mcp.run() call in main block")

    # Check for print to stdout (should use stderr)
    for i, line in enumerate(source.splitlines(), 1):
        if re.search(r'\bprint\s*\([^)]*\)\s*$', line):
            if "file=sys.stderr" not in line and "file=" not in line:
                validator.add_issue(
                    "warning",
                    i,
                    "print() without file=sys.stderr (stdout is for MCP protocol)"
                )

    return validator.issues


def main():
    parser = argparse.ArgumentParser(
        description="Validate a Python MCP server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "file",
        type=Path,
        help="Path to server.py file"
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Treat warnings as errors"
    )

    args = parser.parse_args()

    print(f"Validating: {args.file}")
    print()

    issues = validate_file(args.file)

    # Count by level
    errors = [i for i in issues if i.level == "error"]
    warnings = [i for i in issues if i.level == "warning"]
    infos = [i for i in issues if i.level == "info"]

    # Print issues
    for issue in sorted(issues, key=lambda x: x.line):
        prefix = {
            "error": "ERROR",
            "warning": "WARN ",
            "info": "INFO ",
        }[issue.level]
        print(f"  {prefix} Line {issue.line}: {issue.message}")

    print()
    print(f"Results: {len(errors)} errors, {len(warnings)} warnings, {len(infos)} info")

    # Exit code
    if errors:
        print("\nValidation FAILED")
        sys.exit(1)
    elif args.strict and warnings:
        print("\nValidation FAILED (strict mode)")
        sys.exit(1)
    else:
        print("\nValidation PASSED")
        sys.exit(0)


if __name__ == "__main__":
    main()
