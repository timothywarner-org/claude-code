"""
Refactored Data Processor Module

This is the expected output after refactoring exercise_1_legacy_code.py.
Key improvements:
1. Single Responsibility Principle - separate classes for distinct concerns
2. Type hints throughout
3. Proper error handling with custom exceptions
4. Configuration extracted to dataclasses
5. No magic numbers
6. Comprehensive documentation
"""

from __future__ import annotations

import csv
import json
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, TypedDict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================


class Tier(Enum):
    """Value tier classification."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ReportFormat(Enum):
    """Supported report output formats."""

    JSON = "json"
    CSV = "csv"
    TEXT = "text"


@dataclass(frozen=True)
class ProcessingConfig:
    """Configuration for data processing rules."""

    base_markup_rate: float = 0.15  # 15% base markup
    premium_markup_rate: float = 0.25  # 25% additional for premium
    premium_categories: frozenset[str] = frozenset(["premium", "gold", "platinum"])

    max_value: float = 1_000_000
    min_value: float = 0

    high_tier_threshold: float = 50_000
    medium_tier_threshold: float = 10_000

    max_errors_in_report: int = 10

    def classify_tier(self, value: float) -> Tier:
        """Classify a value into a tier."""
        if value > self.high_tier_threshold:
            return Tier.HIGH
        elif value > self.medium_tier_threshold:
            return Tier.MEDIUM
        return Tier.LOW


# =============================================================================
# Custom Exceptions
# =============================================================================


class DataProcessingError(Exception):
    """Base exception for data processing errors."""

    pass


class InvalidValueError(DataProcessingError):
    """Raised when a data value is invalid."""

    def __init__(self, value: Any, reason: str):
        self.value = value
        self.reason = reason
        super().__init__(f"Invalid value {value}: {reason}")


class UnsupportedFileTypeError(DataProcessingError):
    """Raised when an unsupported file type is encountered."""

    def __init__(self, filename: str):
        self.filename = filename
        super().__init__(f"Unsupported file type: {filename}")


class ReportGenerationError(DataProcessingError):
    """Raised when report generation fails."""

    pass


# =============================================================================
# Data Types
# =============================================================================


class RawDataItem(TypedDict, total=False):
    """Raw data item from input files."""

    id: str
    value: float
    category: str


@dataclass
class ProcessedItem:
    """A processed data item with all transformations applied."""

    id: str
    value: float
    category: str
    tier: Tier
    timestamp: str
    source: str

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "value": self.value,
            "category": self.category,
            "tier": self.tier.value,
            "timestamp": self.timestamp,
            "source": self.source,
        }


@dataclass
class CategoryStats:
    """Statistics for a single category."""

    count: int = 0
    total: float = 0.0

    @property
    def average(self) -> float:
        """Calculate average value for this category."""
        return self.total / self.count if self.count > 0 else 0.0


@dataclass
class ProcessingStats:
    """Aggregate statistics from data processing."""

    count: int = 0
    total: float = 0.0
    by_category: dict[str, CategoryStats] = field(default_factory=dict)
    by_tier: dict[Tier, int] = field(default_factory=lambda: {t: 0 for t in Tier})
    error_count: int = 0

    @property
    def average(self) -> float:
        """Calculate overall average value."""
        return self.total / self.count if self.count > 0 else 0.0


# =============================================================================
# File Reader (Single Responsibility: Reading files)
# =============================================================================


class FileReader(ABC):
    """Abstract base class for file readers."""

    @abstractmethod
    def read(self, filepath: Path) -> list[RawDataItem]:
        """Read and parse a file, returning raw data items."""
        pass


class JsonFileReader(FileReader):
    """Reads JSON files containing data items."""

    def read(self, filepath: Path) -> list[RawDataItem]:
        """Read a JSON file and return raw data items."""
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            logger.warning(f"Expected list in {filepath}, got {type(data).__name__}")
            return []

        return data


class CsvFileReader(FileReader):
    """Reads CSV files containing data items."""

    def read(self, filepath: Path) -> list[RawDataItem]:
        """Read a CSV file and return raw data items."""
        items: list[RawDataItem] = []

        with open(filepath, "r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                item: RawDataItem = {}
                if "id" in row:
                    item["id"] = row["id"]
                if "value" in row:
                    try:
                        item["value"] = float(row["value"])
                    except ValueError:
                        logger.warning(f"Could not parse value: {row.get('value')}")
                        continue
                if "category" in row:
                    item["category"] = row["category"]
                items.append(item)

        return items


class FileReaderFactory:
    """Factory for creating appropriate file readers."""

    _readers: dict[str, type[FileReader]] = {
        ".json": JsonFileReader,
        ".csv": CsvFileReader,
    }

    @classmethod
    def get_reader(cls, filepath: Path) -> FileReader:
        """Get the appropriate reader for a file type."""
        suffix = filepath.suffix.lower()
        reader_class = cls._readers.get(suffix)

        if reader_class is None:
            raise UnsupportedFileTypeError(str(filepath))

        return reader_class()

    @classmethod
    def supported_extensions(cls) -> set[str]:
        """Return set of supported file extensions."""
        return set(cls._readers.keys())


# =============================================================================
# Data Transformer (Single Responsibility: Transforming data)
# =============================================================================


class DataTransformer:
    """Transforms raw data items into processed items."""

    def __init__(self, config: ProcessingConfig | None = None):
        """Initialize with optional configuration."""
        self.config = config or ProcessingConfig()

    def transform(self, item: RawDataItem, source: str) -> ProcessedItem:
        """Transform a raw data item into a processed item.

        Args:
            item: The raw data item to transform
            source: The source filename

        Returns:
            A fully processed item

        Raises:
            InvalidValueError: If the value is out of valid range
        """
        value = item.get("value", 0)

        # Validate value
        if value <= self.config.min_value:
            raise InvalidValueError(value, "Value must be positive")
        if value >= self.config.max_value:
            raise InvalidValueError(value, f"Value exceeds maximum ({self.config.max_value})")

        # Apply base markup
        processed_value = value * (1 + self.config.base_markup_rate)

        # Apply premium markup if applicable
        category = item.get("category", "uncategorized")
        if category in self.config.premium_categories:
            processed_value *= 1 + self.config.premium_markup_rate

        # Classify tier
        tier = self.config.classify_tier(processed_value)

        return ProcessedItem(
            id=item.get("id", "unknown"),
            value=processed_value,
            category=category,
            tier=tier,
            timestamp=datetime.now().isoformat(),
            source=source,
        )


# =============================================================================
# Statistics Calculator (Single Responsibility: Calculating stats)
# =============================================================================


class StatisticsCalculator:
    """Calculates statistics from processed data."""

    def calculate(self, items: list[ProcessedItem], error_count: int = 0) -> ProcessingStats:
        """Calculate comprehensive statistics from processed items.

        Args:
            items: List of processed items
            error_count: Number of errors encountered during processing

        Returns:
            ProcessingStats object with all statistics
        """
        stats = ProcessingStats(error_count=error_count)

        for item in items:
            stats.count += 1
            stats.total += item.value

            # Update category stats
            if item.category not in stats.by_category:
                stats.by_category[item.category] = CategoryStats()
            stats.by_category[item.category].count += 1
            stats.by_category[item.category].total += item.value

            # Update tier stats
            stats.by_tier[item.tier] += 1

        return stats


# =============================================================================
# Report Generator (Single Responsibility: Generating reports)
# =============================================================================


class ReportGenerator(ABC):
    """Abstract base class for report generators."""

    @abstractmethod
    def generate(
        self,
        stats: ProcessingStats,
        errors: list[str],
        output_path: Path,
        max_errors: int,
    ) -> Path:
        """Generate a report file.

        Args:
            stats: Processing statistics
            errors: List of error messages
            output_path: Path to write the report
            max_errors: Maximum number of errors to include

        Returns:
            Path to the generated report
        """
        pass


class JsonReportGenerator(ReportGenerator):
    """Generates JSON format reports."""

    def generate(
        self,
        stats: ProcessingStats,
        errors: list[str],
        output_path: Path,
        max_errors: int,
    ) -> Path:
        """Generate a JSON report."""
        report = self._build_report_data(stats, errors, max_errors)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        return output_path

    def _build_report_data(
        self, stats: ProcessingStats, errors: list[str], max_errors: int
    ) -> dict[str, Any]:
        """Build the report data structure."""
        return {
            "generated_at": datetime.now().isoformat(),
            "summary": {
                "total_items": stats.count,
                "total_value": round(stats.total, 2),
                "average_value": round(stats.average, 2),
                "error_count": stats.error_count,
            },
            "category_breakdown": {
                cat: {
                    "count": cat_stats.count,
                    "total": round(cat_stats.total, 2),
                    "average": round(cat_stats.average, 2),
                }
                for cat, cat_stats in stats.by_category.items()
            },
            "tier_distribution": {tier.value: count for tier, count in stats.by_tier.items()},
            "errors": errors[:max_errors],
        }


class CsvReportGenerator(ReportGenerator):
    """Generates CSV format reports."""

    def generate(
        self,
        stats: ProcessingStats,
        errors: list[str],
        output_path: Path,
        max_errors: int,
    ) -> Path:
        """Generate a CSV report."""
        with open(output_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.writer(f)

            # Summary section
            writer.writerow(["Metric", "Value"])
            writer.writerow(["Total Items", stats.count])
            writer.writerow(["Total Value", round(stats.total, 2)])
            writer.writerow(["Average Value", round(stats.average, 2)])
            writer.writerow(["Error Count", stats.error_count])
            writer.writerow([])

            # Category breakdown
            writer.writerow(["Category", "Count", "Total", "Average"])
            for cat, cat_stats in stats.by_category.items():
                writer.writerow(
                    [
                        cat,
                        cat_stats.count,
                        round(cat_stats.total, 2),
                        round(cat_stats.average, 2),
                    ]
                )

        return output_path


class TextReportGenerator(ReportGenerator):
    """Generates plain text format reports."""

    def generate(
        self,
        stats: ProcessingStats,
        errors: list[str],
        output_path: Path,
        max_errors: int,
    ) -> Path:
        """Generate a text report."""
        lines = [
            "DATA PROCESSING REPORT",
            "=" * 50,
            "",
            f"Generated: {datetime.now().isoformat()}",
            "",
            "SUMMARY",
            "-" * 30,
            f"Total Items: {stats.count}",
            f"Total Value: ${stats.total:,.2f}",
            f"Average Value: ${stats.average:,.2f}",
            f"Errors: {stats.error_count}",
            "",
            "CATEGORY BREAKDOWN",
            "-" * 30,
        ]

        for cat, cat_stats in stats.by_category.items():
            lines.append(f"{cat}: {cat_stats.count} items, ${cat_stats.total:,.2f} total")

        lines.extend(["", "TIER DISTRIBUTION", "-" * 30])
        for tier, count in stats.by_tier.items():
            lines.append(f"{tier.value}: {count} items")

        if errors:
            lines.extend(["", f"ERRORS (first {max_errors})", "-" * 30])
            for error in errors[:max_errors]:
                lines.append(f"- {error}")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return output_path


class ReportGeneratorFactory:
    """Factory for creating appropriate report generators."""

    _generators: dict[ReportFormat, type[ReportGenerator]] = {
        ReportFormat.JSON: JsonReportGenerator,
        ReportFormat.CSV: CsvReportGenerator,
        ReportFormat.TEXT: TextReportGenerator,
    }

    @classmethod
    def get_generator(cls, format: ReportFormat) -> ReportGenerator:
        """Get the appropriate generator for a format."""
        return cls._generators[format]()


# =============================================================================
# Main Processor (Facade that coordinates all components)
# =============================================================================


class DataProcessor:
    """Main data processor that coordinates all processing components.

    This class serves as a facade, maintaining the original API while
    delegating to specialized components internally.
    """

    def __init__(
        self,
        input_dir: str | Path,
        output_dir: str | Path,
        config: ProcessingConfig | None = None,
    ):
        """Initialize the data processor.

        Args:
            input_dir: Directory containing input files
            output_dir: Directory for output files
            config: Optional processing configuration
        """
        self.input_dir = Path(input_dir)
        self.output_dir = Path(output_dir)
        self.config = config or ProcessingConfig()

        self._transformer = DataTransformer(self.config)
        self._stats_calculator = StatisticsCalculator()

        self._data: list[ProcessedItem] = []
        self._errors: list[str] = []
        self._stats: ProcessingStats | None = None

    @property
    def data(self) -> list[dict[str, Any]]:
        """Get processed data as list of dictionaries (for backward compatibility)."""
        return [item.to_dict() for item in self._data]

    @property
    def errors(self) -> list[str]:
        """Get list of processing errors."""
        return self._errors.copy()

    @property
    def stats(self) -> dict[str, Any]:
        """Get statistics as dictionary (for backward compatibility)."""
        if self._stats is None:
            return {}
        return {
            "count": self._stats.count,
            "total": self._stats.total,
            "average": self._stats.average,
            "by_category": {
                cat: {"count": s.count, "total": s.total}
                for cat, s in self._stats.by_category.items()
            },
            "by_tier": {t.value: c for t, c in self._stats.by_tier.items()},
            "error_count": self._stats.error_count,
        }

    def process_file(self, filename: str) -> None:
        """Process a single data file.

        Args:
            filename: Name of the file to process (relative to input_dir)
        """
        filepath = self.input_dir / filename
        logger.info(f"Processing file: {filepath}")

        try:
            reader = FileReaderFactory.get_reader(filepath)
            raw_items = reader.read(filepath)

            for item in raw_items:
                try:
                    processed = self._transformer.transform(item, filename)
                    self._data.append(processed)
                except InvalidValueError as e:
                    self._errors.append(f"{filename}: {e}")
                    logger.warning(f"Skipping invalid item in {filename}: {e}")

        except UnsupportedFileTypeError as e:
            self._errors.append(str(e))
            logger.warning(str(e))
        except Exception as e:
            error_msg = f"Error processing {filename}: {e}"
            self._errors.append(error_msg)
            logger.error(error_msg)

    def process_all(self) -> None:
        """Process all supported files in the input directory."""
        supported = FileReaderFactory.supported_extensions()

        for filepath in self.input_dir.iterdir():
            if filepath.suffix.lower() in supported:
                self.process_file(filepath.name)

        self._calculate_stats()

    def _calculate_stats(self) -> None:
        """Calculate statistics from processed data."""
        self._stats = self._stats_calculator.calculate(self._data, len(self._errors))

    def generate_report(self, format: str = "json") -> str:
        """Generate a report in the specified format.

        Args:
            format: Output format ('json', 'csv', or 'text')

        Returns:
            Path to the generated report file

        Raises:
            ValueError: If format is not supported
            ReportGenerationError: If report generation fails
        """
        if self._stats is None:
            self._calculate_stats()

        try:
            report_format = ReportFormat(format)
        except ValueError:
            raise ValueError(f"Unsupported format: {format}")

        generator = ReportGeneratorFactory.get_generator(report_format)

        # Determine output filename
        extension = format if format != "text" else "txt"
        output_path = self.output_dir / f"report.{extension}"

        try:
            result = generator.generate(
                self._stats,
                self._errors,
                output_path,
                self.config.max_errors_in_report,
            )
            logger.info(f"Generated report: {result}")
            return str(result)
        except Exception as e:
            raise ReportGenerationError(f"Failed to generate report: {e}") from e

    def export_data(self, filename: str = "processed_data.json") -> str:
        """Export processed data to a JSON file.

        Args:
            filename: Output filename

        Returns:
            Path to the exported file
        """
        output_path = self.output_dir / filename

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2)

        logger.info(f"Exported data to: {output_path}")
        return str(output_path)

    def get_items_by_tier(self, tier: str) -> list[dict[str, Any]]:
        """Get all items of a specific tier.

        Args:
            tier: Tier name ('high', 'medium', or 'low')

        Returns:
            List of items in that tier
        """
        try:
            tier_enum = Tier(tier)
        except ValueError:
            return []
        return [item.to_dict() for item in self._data if item.tier == tier_enum]

    def get_items_by_category(self, category: str) -> list[dict[str, Any]]:
        """Get all items of a specific category.

        Args:
            category: Category name

        Returns:
            List of items in that category
        """
        return [item.to_dict() for item in self._data if item.category == category]

    def get_high_value_items(self, threshold: float = 50000) -> list[dict[str, Any]]:
        """Get items above a value threshold.

        Args:
            threshold: Minimum value threshold

        Returns:
            List of items above the threshold
        """
        return [item.to_dict() for item in self._data if item.value > threshold]

    def clear(self) -> None:
        """Clear all processed data and errors."""
        self._data = []
        self._errors = []
        self._stats = None
        logger.info("Cleared all data")


# =============================================================================
# Main entry point for testing
# =============================================================================

if __name__ == "__main__":
    import shutil
    import tempfile

    # Create test directories
    input_dir = Path(tempfile.mkdtemp())
    output_dir = Path(tempfile.mkdtemp())

    try:
        # Create sample input file
        sample_data = [
            {"id": "1", "value": 1000, "category": "standard"},
            {"id": "2", "value": 5000, "category": "premium"},
            {"id": "3", "value": 100000, "category": "gold"},
            {"id": "4", "value": -50, "category": "standard"},  # Invalid
        ]

        with open(input_dir / "test.json", "w") as f:
            json.dump(sample_data, f)

        # Process
        processor = DataProcessor(input_dir, output_dir)
        processor.process_all()

        # Generate reports
        processor.generate_report("json")
        processor.generate_report("text")

        print(f"Stats: {processor.stats}")
        print(f"Errors: {processor.errors}")
        print(f"High value items: {processor.get_high_value_items()}")

    finally:
        # Cleanup
        shutil.rmtree(input_dir)
        shutil.rmtree(output_dir)
