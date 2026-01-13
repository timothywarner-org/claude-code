"""
Tests for the Memory MCP Server.

Run with: pytest test_memory_server.py -v
"""

import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from memory_server import (
    mcp,
    get_memory_store,
    reset_memory_store,
    load_memories,
    load_memory_data,
    get_available_tags,
    get_available_types,
    generate_memory_id,
    list_memory_items,
    list_available_tags,
    list_memory_types,
    get_memory_stats,
    add_memory,
    get_memory,
    search_memory,
    get_optimized_memory,
    update_memory,
    delete_memory,
    list_by_tag,
    list_by_type,
    reset_memory,
    test_apis,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(autouse=True)
def reset_store_between_tests():
    """Reset the memory store before each test."""
    reset_memory_store()
    yield
    reset_memory_store()


@pytest.fixture
def mock_deepseek_client():
    """Mock DeepSeek client for testing optimization."""
    with patch('memory_server.deepseek_client') as mock:
        # Default successful optimization
        mock.optimize_memory_item.return_value = (
            "Optimized content here",
            {
                "success": True,
                "original_tokens": 1000,
                "optimized_tokens": 500,
                "cached": False,
                "reduction": "50.0%"
            }
        )
        mock.test_connection.return_value = (True, "Connected successfully")
        mock.get_cache_stats.return_value = {
            "total_entries": 0,
            "avg_reduction": "0%",
            "total_tokens_saved": 0
        }
        yield mock


@pytest.fixture
def mock_github_client():
    """Mock GitHub client for testing API connectivity."""
    with patch('memory_server.github_client') as mock:
        mock.test_connection.return_value = (True, "Connected as: testuser")
        yield mock


# =============================================================================
# Environment and Setup Tests
# =============================================================================

class TestEnvironmentSetup:
    """Tests for environment variable loading."""

    def test_dotenv_loads_openai_key(self):
        """Should load OPENAI_API_KEY from .env file."""
        # The key should be loaded by dotenv at module import
        key = os.getenv("OPENAI_API_KEY")
        assert key is not None, "OPENAI_API_KEY should be loaded from .env"

    def test_dotenv_loads_github_token(self):
        """Should load GITHUB_TOKEN from .env file."""
        token = os.getenv("GITHUB_TOKEN")
        assert token is not None, "GITHUB_TOKEN should be loaded from .env"

    def test_dotenv_loads_base_url(self):
        """Should load OPENAI_BASE_URL from .env file."""
        base_url = os.getenv("OPENAI_BASE_URL")
        assert base_url is not None, "OPENAI_BASE_URL should be loaded from .env"


# =============================================================================
# Data Loading Tests
# =============================================================================

class TestDataLoading:
    """Tests for data loading functionality."""

    def test_load_memories_returns_list(self):
        """load_memories should return a list."""
        memories = load_memories()
        assert isinstance(memories, list)

    def test_load_memories_not_empty(self):
        """load_memories should return non-empty list."""
        memories = load_memories()
        assert len(memories) > 0, "Should have sample memories"

    def test_memories_have_required_fields(self):
        """Each memory should have required fields."""
        memories = load_memories()
        required_fields = {"id", "type", "title", "content", "tags", "project", "created_at", "updated_at"}

        for mem in memories:
            assert required_fields.issubset(mem.keys()), \
                f"Memory {mem.get('id', 'unknown')} missing fields"

    def test_get_memory_store_returns_same_instance(self):
        """get_memory_store should return the same list instance."""
        store1 = get_memory_store()
        store2 = get_memory_store()
        assert store1 is store2

    def test_load_memory_data_has_tags(self):
        """load_memory_data should include predefined tags."""
        data = load_memory_data()
        assert "tags" in data
        assert isinstance(data["tags"], list)
        assert len(data["tags"]) > 0

    def test_load_memory_data_has_types(self):
        """load_memory_data should include memory types."""
        data = load_memory_data()
        assert "types" in data
        assert isinstance(data["types"], list)
        assert len(data["types"]) > 0

    def test_predefined_tags_include_course_tags(self):
        """Should have predefined course-relevant tags."""
        tags = get_available_tags()
        tag_names = [t["name"] for t in tags]

        assert "mcp-server" in tag_names
        assert "claude-api" in tag_names
        assert "tool-use" in tag_names

    def test_memory_types_include_all_types(self):
        """Should have all 7 memory types."""
        types = get_available_types()
        type_names = [t["name"] for t in types]

        expected_types = ["note", "prd", "snippet", "decision", "pattern", "config", "troubleshooting"]
        for expected in expected_types:
            assert expected in type_names, f"Missing type: {expected}"


# =============================================================================
# Resource Tests
# =============================================================================

class TestResources:
    """Tests for MCP resources."""

    def test_list_memory_items_returns_string(self):
        """list_memory_items resource should return markdown string."""
        result = list_memory_items.fn()
        assert isinstance(result, str)
        assert "Memory Items" in result

    def test_list_memory_items_shows_ids(self):
        """list_memory_items should show memory IDs."""
        result = list_memory_items.fn()
        assert "mem-" in result

    def test_list_available_tags_returns_string(self):
        """list_available_tags resource should return markdown string."""
        result = list_available_tags.fn()
        assert isinstance(result, str)
        assert "Tags" in result

    def test_list_available_tags_shows_descriptions(self):
        """list_available_tags should include tag descriptions."""
        result = list_available_tags.fn()
        assert "mcp-server" in result
        assert "claude-api" in result

    def test_list_memory_types_returns_string(self):
        """list_memory_types resource should return markdown string."""
        result = list_memory_types.fn()
        assert isinstance(result, str)
        assert "Memory Types" in result

    def test_get_memory_stats_returns_string(self):
        """get_memory_stats resource should return markdown string."""
        result = get_memory_stats.fn()
        assert isinstance(result, str)
        assert "Statistics" in result

    def test_get_memory_stats_shows_type_counts(self):
        """get_memory_stats should show counts by type."""
        result = get_memory_stats.fn()
        assert "By Type" in result
        assert "Count" in result


# =============================================================================
# Tool Tests - CRUD Operations
# =============================================================================

class TestAddMemory:
    """Tests for add_memory tool."""

    def test_add_memory_creates_new_item(self):
        """Should create a new memory item."""
        initial_count = len(get_memory_store())

        result = add_memory.fn(
            title="Test Memory",
            content="Test content here",
            type="note",
            tags=["test"],
            project="test-project"
        )

        assert result["success"] is True
        assert "memory" in result
        assert len(get_memory_store()) == initial_count + 1

    def test_add_memory_generates_id(self):
        """Should generate sequential memory ID."""
        result = add_memory.fn(
            title="Test",
            content="Content",
            type="note"
        )

        assert result["memory"]["id"].startswith("mem-")

    def test_add_memory_sets_timestamps(self):
        """Should set created_at and updated_at timestamps."""
        result = add_memory.fn(
            title="Test",
            content="Content",
            type="note"
        )

        mem = result["memory"]
        assert "created_at" in mem
        assert "updated_at" in mem
        assert mem["created_at"] == mem["updated_at"]

    def test_add_memory_defaults_to_general_project(self):
        """Should default to 'general' project if not specified."""
        result = add_memory.fn(
            title="Test",
            content="Content",
            type="note"
        )

        assert result["memory"]["project"] == "general"


class TestGetMemory:
    """Tests for get_memory tool."""

    def test_get_existing_memory(self):
        """Should return memory when ID exists."""
        result = get_memory.fn("mem-001")
        assert result["success"] is True
        assert "memory" in result
        assert result["memory"]["id"] == "mem-001"

    def test_get_nonexistent_memory(self):
        """Should return error for non-existent ID."""
        result = get_memory.fn("mem-999")
        assert result["success"] is False
        assert "error" in result

    def test_get_memory_case_insensitive(self):
        """ID lookup should be case-insensitive."""
        result = get_memory.fn("MEM-001")
        assert result["success"] is True


class TestSearchMemory:
    """Tests for search_memory tool."""

    def test_search_finds_matching_memories(self):
        """Should find memories matching search term."""
        result = search_memory.fn("MCP")
        assert result["success"] is True
        assert result["count"] > 0
        assert len(result["memories"]) > 0

    def test_search_with_no_matches(self):
        """Should return error when no matches found."""
        result = search_memory.fn("xyznonexistent123")
        assert result["success"] is False

    def test_search_with_tag_filter(self):
        """Should filter by tag."""
        result = search_memory.fn("server", tag="mcp-server")
        if result["success"]:
            for mem in result["memories"]:
                assert "mcp-server" in [t.lower() for t in mem["tags"]]

    def test_search_with_type_filter(self):
        """Should filter by type."""
        result = search_memory.fn("code", type="snippet")
        if result["success"]:
            for mem in result["memories"]:
                assert mem["type"] == "snippet"

    def test_search_with_project_filter(self):
        """Should filter by project."""
        result = search_memory.fn("review", project="capstone")
        if result["success"]:
            for mem in result["memories"]:
                assert mem["project"] == "capstone"


class TestGetOptimizedMemory:
    """Tests for get_optimized_memory tool with DeepSeek optimization."""

    def test_get_optimized_memory_success(self, mock_deepseek_client):
        """Should return optimized memory content."""
        result = get_optimized_memory.fn("mem-001")

        assert result["success"] is True
        assert "memory" in result
        assert "optimization" in result
        assert result["optimization"]["success"] is True

    def test_get_optimized_memory_calls_deepseek(self, mock_deepseek_client):
        """Should call DeepSeek optimization."""
        get_optimized_memory.fn("mem-001", max_tokens=1000)

        mock_deepseek_client.optimize_memory_item.assert_called_once()
        call_args = mock_deepseek_client.optimize_memory_item.call_args
        assert call_args[1]["max_tokens"] == 1000

    def test_get_optimized_memory_respects_cache_param(self, mock_deepseek_client):
        """Should pass use_cache parameter to DeepSeek."""
        get_optimized_memory.fn("mem-001", use_cache=False)

        call_args = mock_deepseek_client.optimize_memory_item.call_args
        assert call_args[1]["use_cache"] is False

    def test_get_optimized_memory_nonexistent_id(self, mock_deepseek_client):
        """Should return error for non-existent memory ID."""
        result = get_optimized_memory.fn("mem-999")

        assert result["success"] is False
        assert "error" in result
        mock_deepseek_client.optimize_memory_item.assert_not_called()

    def test_get_optimized_memory_fallback_on_failure(self, mock_deepseek_client):
        """Should fall back to raw content if optimization fails."""
        # Mock optimization failure
        mock_deepseek_client.optimize_memory_item.return_value = (
            "Original content unchanged",
            {
                "success": False,
                "error": "API failure",
                "fallback": True,
                "original_tokens": 1000,
                "optimized_tokens": 1000
            }
        )

        result = get_optimized_memory.fn("mem-001")

        assert result["success"] is True
        assert result["optimization"]["fallback"] is True


class TestUpdateMemory:
    """Tests for update_memory tool."""

    def test_update_memory_title(self):
        """Should update memory title."""
        result = update_memory.fn("mem-001", title="Updated Title")

        assert result["success"] is True
        assert result["memory"]["title"] == "Updated Title"

    def test_update_memory_content(self):
        """Should update memory content."""
        result = update_memory.fn("mem-001", content="New content")

        assert result["success"] is True
        assert result["memory"]["content"] == "New content"

    def test_update_memory_updates_timestamp(self):
        """Should update the updated_at timestamp."""
        original = get_memory.fn("mem-001")["memory"]
        original_updated_at = original["updated_at"]

        import time
        time.sleep(0.1)  # Ensure time difference

        result = update_memory.fn("mem-001", title="New Title")

        assert result["memory"]["updated_at"] != original_updated_at

    def test_update_nonexistent_memory(self):
        """Should return error for non-existent memory."""
        result = update_memory.fn("mem-999", title="Test")

        assert result["success"] is False
        assert "error" in result


class TestDeleteMemory:
    """Tests for delete_memory tool."""

    def test_delete_existing_memory(self):
        """Should delete existing memory."""
        initial_count = len(get_memory_store())
        result = delete_memory.fn("mem-001")

        assert result["success"] is True
        assert len(get_memory_store()) == initial_count - 1

    def test_delete_nonexistent_memory(self):
        """Should return error for non-existent memory."""
        result = delete_memory.fn("mem-999")
        assert result["success"] is False

    def test_deleted_memory_not_retrievable(self):
        """Deleted memory should not be found."""
        delete_memory.fn("mem-001")
        result = get_memory.fn("mem-001")
        assert result["success"] is False


class TestListByTag:
    """Tests for list_by_tag tool."""

    def test_list_by_tag_finds_matches(self):
        """Should find memories with specified tag."""
        result = list_by_tag.fn("mcp-server")

        assert result["success"] is True
        assert result["count"] > 0

        for mem in result["memories"]:
            tags_lower = [t.lower() for t in mem["tags"]]
            assert "mcp-server" in tags_lower

    def test_list_by_tag_no_matches(self):
        """Should return error when tag not found."""
        result = list_by_tag.fn("nonexistent-tag")

        assert result["success"] is False
        assert "error" in result


class TestListByType:
    """Tests for list_by_type tool."""

    def test_list_by_type_finds_matches(self):
        """Should find memories of specified type."""
        result = list_by_type.fn("snippet")

        if result["success"]:
            for mem in result["memories"]:
                assert mem["type"] == "snippet"

    def test_list_by_type_no_matches(self):
        """Should handle type with no memories."""
        # First delete all snippets
        memories = get_memory_store()
        for mem in memories[:]:
            if mem["type"] == "snippet":
                delete_memory.fn(mem["id"])

        result = list_by_type.fn("snippet")
        assert result["success"] is False


class TestResetMemory:
    """Tests for reset_memory tool."""

    def test_reset_restores_deleted_memories(self):
        """reset_memory should restore deleted memories."""
        initial_count = len(get_memory_store())

        # Delete some memories
        delete_memory.fn("mem-001")
        delete_memory.fn("mem-002")
        assert len(get_memory_store()) == initial_count - 2

        # Reset
        result = reset_memory.fn()
        assert result["success"] is True
        assert len(get_memory_store()) == initial_count


class TestAPIConnectivity:
    """Tests for test_apis tool."""

    def test_test_apis_returns_status(self, mock_deepseek_client, mock_github_client):
        """Should return status for both APIs."""
        result = test_apis.fn()

        assert result["success"] is True
        assert "deepseek" in result
        assert "github" in result
        assert "cache_stats" in result

    def test_test_apis_checks_deepseek(self, mock_deepseek_client, mock_github_client):
        """Should call DeepSeek connection test."""
        test_apis.fn()

        mock_deepseek_client.test_connection.assert_called_once()

    def test_test_apis_checks_github(self, mock_deepseek_client, mock_github_client):
        """Should call GitHub connection test."""
        test_apis.fn()

        mock_github_client.test_connection.assert_called_once()


# =============================================================================
# Helper Function Tests
# =============================================================================

class TestHelperFunctions:
    """Tests for helper functions."""

    def test_generate_memory_id_sequential(self):
        """Should generate sequential IDs."""
        # Add a memory to get the next ID
        initial_memories = len(get_memory_store())

        new_id = generate_memory_id()
        assert new_id.startswith("mem-")

        # Verify it's one more than the highest
        expected_num = initial_memories + 1
        assert new_id == f"mem-{expected_num:03d}"

    def test_generate_memory_id_handles_empty_store(self):
        """Should generate mem-001 for empty store."""
        # Clear store
        store = get_memory_store()
        store.clear()

        new_id = generate_memory_id()
        assert new_id == "mem-001"


# =============================================================================
# Server Configuration Tests
# =============================================================================

class TestServerConfiguration:
    """Tests for server configuration."""

    def test_server_has_name(self):
        """Server should have a name configured."""
        assert mcp.name == "Memory Server"

    def test_server_has_instructions(self):
        """Server should have instructions configured."""
        assert mcp.instructions is not None
        assert len(mcp.instructions) > 0
        assert "memory" in mcp.instructions.lower()
