"""
Basic tests for the Copilot Tips MCP Server.

Run with: pytest test_copilot_tips_server.py -v
"""

import pytest
from copilot_tips_server import (
    mcp,
    get_tips_store,
    reset_tips_store,
    load_tips,
    list_categories,
    get_stats,
    get_tip_by_id,
    get_tip_by_topic,
    get_random_tip,
    delete_tip,
    reset_tips,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def reset_store_between_tests():
    """Reset the tips store before each test."""
    reset_tips_store()
    yield
    reset_tips_store()


# =============================================================================
# Data Loading Tests
# =============================================================================

class TestDataLoading:
    """Tests for data loading functionality."""

    def test_load_tips_returns_list(self):
        """load_tips should return a list."""
        tips = load_tips()
        assert isinstance(tips, list)

    def test_load_tips_not_empty(self):
        """load_tips should return non-empty list."""
        tips = load_tips()
        assert len(tips) > 0

    def test_tips_have_required_fields(self):
        """Each tip should have id, title, description, category, difficulty."""
        tips = load_tips()
        required_fields = {"id", "title", "description", "category", "difficulty"}

        for tip in tips:
            assert required_fields.issubset(tip.keys()), f"Tip missing fields: {tip.get('id', 'unknown')}"

    def test_get_tips_store_returns_same_instance(self):
        """get_tips_store should return the same list instance."""
        store1 = get_tips_store()
        store2 = get_tips_store()
        assert store1 is store2


# =============================================================================
# Resource Tests
# =============================================================================

class TestResources:
    """Tests for MCP resources."""

    def test_list_categories_returns_string(self):
        """list_categories resource should return markdown string."""
        result = list_categories.fn()
        assert isinstance(result, str)
        assert "Categories" in result

    def test_list_categories_contains_known_categories(self):
        """list_categories should include expected categories."""
        result = list_categories.fn()
        assert "Prompting Techniques" in result
        assert "IDE Shortcuts" in result

    def test_get_stats_returns_string(self):
        """get_stats resource should return markdown string."""
        result = get_stats.fn()
        assert isinstance(result, str)
        assert "Statistics" in result

    def test_get_stats_shows_difficulty_levels(self):
        """get_stats should show beginner, intermediate, advanced."""
        result = get_stats.fn()
        assert "beginner" in result.lower() or "Beginner" in result
        assert "intermediate" in result.lower() or "Intermediate" in result


# =============================================================================
# Tool Tests
# =============================================================================

class TestGetTipById:
    """Tests for get_tip_by_id tool."""

    def test_get_existing_tip(self):
        """Should return tip when ID exists."""
        result = get_tip_by_id.fn("prompt-001")
        assert result["success"] is True
        assert "tip" in result
        assert result["tip"]["id"] == "prompt-001"

    def test_get_nonexistent_tip(self):
        """Should return error for non-existent ID."""
        result = get_tip_by_id.fn("nonexistent-999")
        assert result["success"] is False
        assert "error" in result

    def test_get_tip_case_insensitive(self):
        """ID lookup should be case-insensitive."""
        result = get_tip_by_id.fn("PROMPT-001")
        assert result["success"] is True


class TestGetTipByTopic:
    """Tests for get_tip_by_topic tool."""

    def test_search_finds_matching_tips(self):
        """Should find tips matching search term."""
        result = get_tip_by_topic.fn("chat")
        assert result["success"] is True
        assert result["count"] > 0
        assert len(result["tips"]) > 0

    def test_search_with_no_matches(self):
        """Should return error when no matches found."""
        result = get_tip_by_topic.fn("xyznonexistent123")
        assert result["success"] is False

    def test_search_with_category_filter(self):
        """Should filter by category."""
        result = get_tip_by_topic.fn("tip", category="IDE Shortcuts")
        if result["success"]:
            for tip in result["tips"]:
                assert tip["category"] == "IDE Shortcuts"

    def test_search_with_difficulty_filter(self):
        """Should filter by difficulty."""
        result = get_tip_by_topic.fn("copilot", difficulty="beginner")
        if result["success"]:
            for tip in result["tips"]:
                assert tip["difficulty"] == "beginner"


class TestGetRandomTip:
    """Tests for get_random_tip tool."""

    def test_get_random_returns_tip(self):
        """Should return a random tip."""
        result = get_random_tip.fn()
        assert result["success"] is True
        assert "tip" in result
        assert "pool_size" in result

    def test_random_tip_with_category_filter(self):
        """Should return tip from specified category."""
        result = get_random_tip.fn(category="Prompting Techniques")
        assert result["success"] is True
        assert result["tip"]["category"] == "Prompting Techniques"

    def test_random_tip_with_difficulty_filter(self):
        """Should return tip with specified difficulty."""
        result = get_random_tip.fn(difficulty="beginner")
        assert result["success"] is True
        assert result["tip"]["difficulty"] == "beginner"

    def test_random_tip_with_invalid_category(self):
        """Should return error for non-existent category."""
        result = get_random_tip.fn(category="Nonexistent Category")
        assert result["success"] is False

    def test_random_tip_returns_different_tips(self):
        """Should return different tips on multiple calls (probabilistic)."""
        results = [get_random_tip.fn()["tip"]["id"] for _ in range(20)]
        unique_ids = set(results)
        # With enough tips, we should get at least 2 different ones in 20 tries
        assert len(unique_ids) >= 2, "Random tip seems to always return the same tip"


class TestDeleteTip:
    """Tests for delete_tip tool."""

    def test_delete_existing_tip(self):
        """Should delete existing tip."""
        initial_count = len(get_tips_store())
        result = delete_tip.fn("prompt-001")

        assert result["success"] is True
        assert len(get_tips_store()) == initial_count - 1

    def test_delete_nonexistent_tip(self):
        """Should return error for non-existent tip."""
        result = delete_tip.fn("nonexistent-999")
        assert result["success"] is False

    def test_deleted_tip_not_retrievable(self):
        """Deleted tip should not be found."""
        delete_tip.fn("prompt-001")
        result = get_tip_by_id.fn("prompt-001")
        assert result["success"] is False


class TestResetTips:
    """Tests for reset_tips tool."""

    def test_reset_restores_deleted_tips(self):
        """reset_tips should restore deleted tips."""
        initial_count = len(get_tips_store())

        # Delete some tips
        delete_tip.fn("prompt-001")
        delete_tip.fn("prompt-002")
        assert len(get_tips_store()) == initial_count - 2

        # Reset
        result = reset_tips.fn()
        assert result["success"] is True
        assert len(get_tips_store()) == initial_count


# =============================================================================
# Server Configuration Tests
# =============================================================================

class TestServerConfiguration:
    """Tests for server configuration."""

    def test_server_has_name(self):
        """Server should have a name configured."""
        assert mcp.name == "Copilot Tips Server"

    def test_server_has_instructions(self):
        """Server should have instructions configured."""
        assert mcp.instructions is not None
        assert len(mcp.instructions) > 0
