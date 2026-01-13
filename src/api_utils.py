"""
API utilities for Memory MCP Server

Provides DeepSeek LLM integration for context optimization and GitHub API client.
"""

import hashlib
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import tiktoken
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env in the src directory
ENV_FILE = Path(__file__).parent / ".env"
load_dotenv(ENV_FILE, override=False)

# Configure logging
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)


@dataclass
class OptimizedCacheEntry:
    """Cache entry for optimized memory content."""
    optimized_text: str
    timestamp: datetime
    original_tokens: int
    optimized_tokens: int


class OptimizedCache:
    """In-memory cache for optimized memory items with TTL."""

    def __init__(self, ttl_hours: int = 1):
        self.cache: dict[str, OptimizedCacheEntry] = {}
        self.ttl = timedelta(hours=ttl_hours)

    def _get_hash(self, content: str, max_tokens: int) -> str:
        """Generate cache key from content and max_tokens."""
        key = f"{content}:{max_tokens}"
        return hashlib.sha256(key.encode()).hexdigest()

    def get(self, content: str, max_tokens: int) -> Optional[str]:
        """Retrieve cached optimized content if not expired."""
        cache_key = self._get_hash(content, max_tokens)
        entry = self.cache.get(cache_key)

        if entry is None:
            return None

        # Check if expired
        if datetime.now() - entry.timestamp > self.ttl:
            del self.cache[cache_key]
            return None

        logger.info(f"Cache hit for content hash {cache_key[:8]}...")
        return entry.optimized_text

    def set(self, content: str, max_tokens: int, optimized_text: str,
            original_tokens: int, optimized_tokens: int):
        """Store optimized content in cache."""
        cache_key = self._get_hash(content, max_tokens)
        self.cache[cache_key] = OptimizedCacheEntry(
            optimized_text=optimized_text,
            timestamp=datetime.now(),
            original_tokens=original_tokens,
            optimized_tokens=optimized_tokens
        )
        logger.info(f"Cached optimized content {cache_key[:8]}... "
                   f"({original_tokens} -> {optimized_tokens} tokens)")

    def clear(self):
        """Clear all cached entries."""
        self.cache.clear()
        logger.info("Cache cleared")

    def get_stats(self) -> dict:
        """Get cache statistics."""
        total_entries = len(self.cache)
        if total_entries == 0:
            return {
                "total_entries": 0,
                "avg_reduction": 0.0,
                "total_tokens_saved": 0
            }

        total_saved = sum(e.original_tokens - e.optimized_tokens
                         for e in self.cache.values())
        total_original = sum(e.original_tokens for e in self.cache.values())
        avg_reduction = (total_saved / total_original * 100) if total_original > 0 else 0

        return {
            "total_entries": total_entries,
            "avg_reduction": f"{avg_reduction:.1f}%",
            "total_tokens_saved": total_saved
        }


class DeepSeekClient:
    """Client for DeepSeek LLM API (OpenAI-compatible)."""

    def __init__(self):
        self.client: Optional[OpenAI] = None
        self.encoding = tiktoken.get_encoding("cl100k_base")
        self.cache = OptimizedCache(ttl_hours=1)
        self._initialized = False
        self._connection_tested = False

    def _initialize(self):
        """Lazy initialization of OpenAI client with DeepSeek configuration."""
        if self._initialized:
            return

        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com")

        if not api_key:
            logger.warning("OPENAI_API_KEY not found in environment. "
                         "DeepSeek optimization will be unavailable.")
            self._initialized = True
            return

        try:
            self.client = OpenAI(
                api_key=api_key,
                base_url=base_url,
                timeout=30.0
            )
            self._initialized = True
            logger.info("DeepSeek client initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize DeepSeek client: {e}")
            self._initialized = True

    def test_connection(self) -> tuple[bool, str]:
        """Test connection to DeepSeek API."""
        if self._connection_tested:
            return (True, "Connection already verified")

        self._initialize()

        if not self.client:
            return (False, "DeepSeek client not initialized (check API key)")

        try:
            response = self.client.chat.completions.create(
                model=os.getenv("LLM_MODEL", "deepseek-chat"),
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            self._connection_tested = True
            return (True, f"Connection successful: {response.choices[0].message.content}")
        except Exception as e:
            logger.warning(f"DeepSeek connection test failed: {e}")
            return (False, f"Connection failed: {str(e)}")

    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken."""
        return len(self.encoding.encode(text))

    def optimize_memory_item(self, content: str, max_tokens: int = 1500,
                            use_cache: bool = True) -> tuple[str, dict]:
        """
        Optimize memory content for token efficiency using DeepSeek.

        Preserves technical details (code, commands, configs) while removing fluff.

        Args:
            content: Original memory content to optimize
            max_tokens: Target maximum token count for optimized content
            use_cache: Whether to use cached optimized version if available

        Returns:
            Tuple of (optimized_content, metadata_dict)
            metadata includes: success, original_tokens, optimized_tokens, cached, error
        """
        self._initialize()

        original_tokens = self.count_tokens(content)

        # Check cache first
        if use_cache:
            cached = self.cache.get(content, max_tokens)
            if cached:
                return cached, {
                    "success": True,
                    "original_tokens": original_tokens,
                    "optimized_tokens": self.count_tokens(cached),
                    "cached": True,
                    "reduction": f"{(1 - self.count_tokens(cached)/original_tokens)*100:.1f}%"
                }

        # If content is already under budget, return as-is
        if original_tokens <= max_tokens:
            return content, {
                "success": True,
                "original_tokens": original_tokens,
                "optimized_tokens": original_tokens,
                "cached": False,
                "reduction": "0%",
                "message": "Content already within token budget"
            }

        # Attempt optimization with retry logic
        if not self.client:
            logger.warning("DeepSeek client unavailable, returning raw content")
            return content, {
                "success": False,
                "original_tokens": original_tokens,
                "optimized_tokens": original_tokens,
                "cached": False,
                "error": "DeepSeek client not initialized",
                "fallback": True
            }

        optimization_prompt = f"""Condense the following technical content to approximately {max_tokens} tokens while preserving ALL:
- Code snippets (keep syntax intact)
- Command-line commands (exact syntax)
- Configuration values (API keys, URLs, paths)
- File names and paths
- Technical terms and acronyms
- Numbers and version strings

Remove:
- Redundant explanations
- Conversational filler
- Unnecessary context

Content to optimize:
{content}

Return only the condensed version, maintaining technical accuracy."""

        for attempt in range(3):
            try:
                response = self.client.chat.completions.create(
                    model=os.getenv("LLM_MODEL", "deepseek-chat"),
                    messages=[
                        {"role": "system", "content": "You are a technical content optimizer that preserves precision while reducing verbosity."},
                        {"role": "user", "content": optimization_prompt}
                    ],
                    max_tokens=max_tokens + 200,  # Buffer for response overhead
                    temperature=0.3
                )

                optimized = response.choices[0].message.content.strip()
                optimized_tokens = self.count_tokens(optimized)

                # Cache the result
                if use_cache:
                    self.cache.set(content, max_tokens, optimized,
                                 original_tokens, optimized_tokens)

                return optimized, {
                    "success": True,
                    "original_tokens": original_tokens,
                    "optimized_tokens": optimized_tokens,
                    "cached": False,
                    "reduction": f"{(1 - optimized_tokens/original_tokens)*100:.1f}%",
                    "attempts": attempt + 1
                }

            except Exception as e:
                logger.warning(f"Optimization attempt {attempt + 1} failed: {e}")
                if attempt < 2:
                    time.sleep(2 ** attempt)  # Exponential backoff
                continue

        # All retries failed, return raw content
        logger.warning("All optimization attempts failed, returning raw content")
        return content, {
            "success": False,
            "original_tokens": original_tokens,
            "optimized_tokens": original_tokens,
            "cached": False,
            "error": "Optimization failed after 3 attempts",
            "fallback": True
        }

    def get_cache_stats(self) -> dict:
        """Get optimization cache statistics."""
        return self.cache.get_stats()


class GitHubClient:
    """Client for GitHub API (for future integration)."""

    def __init__(self):
        self.token: Optional[str] = None
        self._initialized = False
        self._connection_tested = False

    def _initialize(self):
        """Lazy initialization of GitHub client."""
        if self._initialized:
            return

        self.token = os.getenv("GITHUB_TOKEN")

        if not self.token:
            logger.warning("GITHUB_TOKEN not found in environment. "
                         "GitHub integration will be unavailable.")

        self._initialized = True
        logger.info("GitHub client initialized")

    def test_connection(self) -> tuple[bool, str]:
        """Test connection to GitHub API."""
        if self._connection_tested:
            return (True, "Connection already verified")

        self._initialize()

        if not self.token:
            return (False, "GitHub token not configured")

        try:
            import requests
            response = requests.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"token {self.token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=10
            )

            if response.status_code == 200:
                self._connection_tested = True
                user = response.json()
                return (True, f"Connected as: {user.get('login', 'unknown')}")
            else:
                return (False, f"GitHub API returned status {response.status_code}")

        except Exception as e:
            logger.warning(f"GitHub connection test failed: {e}")
            return (False, f"Connection failed: {str(e)}")


# Global instances for use across the server
deepseek_client = DeepSeekClient()
github_client = GitHubClient()
