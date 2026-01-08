"""
Legacy Data Processor Module

This file contains a "legacy" DataProcessor class that has grown
organically over time. It demonstrates common anti-patterns that
you will learn to refactor using Claude Code.

DO NOT MODIFY THIS FILE - use it as the starting point for your refactoring exercise.
"""

import os
import json
import csv
from datetime import datetime


class DataProcessor:
    """Processes data files and generates reports."""

    def __init__(self, input_dir, output_dir):
        self.input_dir = input_dir
        self.output_dir = output_dir
        self.data = []
        self.errors = []
        self.stats = {}

    def process_file(self, filename):
        """Process a single data file."""
        try:
            filepath = os.path.join(self.input_dir, filename)
            if filename.endswith('.json'):
                with open(filepath, 'r') as f:
                    raw = json.load(f)
                    if isinstance(raw, list):
                        for item in raw:
                            if 'value' in item and item['value'] > 0:
                                if item['value'] < 1000000:
                                    processed = {
                                        'id': item.get('id', 'unknown'),
                                        'value': item['value'] * 1.15,  # Apply 15% markup
                                        'category': item.get('category', 'uncategorized'),
                                        'timestamp': datetime.now().isoformat(),
                                        'source': filename
                                    }
                                    if processed['category'] in ['premium', 'gold', 'platinum']:
                                        processed['value'] = processed['value'] * 1.25  # Premium 25% extra
                                    if processed['value'] > 50000:
                                        processed['tier'] = 'high'
                                    elif processed['value'] > 10000:
                                        processed['tier'] = 'medium'
                                    else:
                                        processed['tier'] = 'low'
                                    self.data.append(processed)
                                else:
                                    self.errors.append(f"Value too large in {filename}: {item['value']}")
                            else:
                                self.errors.append(f"Invalid item in {filename}: {item}")
                    else:
                        self.errors.append(f"Expected list in {filename}")
            elif filename.endswith('.csv'):
                with open(filepath, 'r') as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        try:
                            val = float(row.get('value', 0))
                            if val > 0 and val < 1000000:
                                processed = {
                                    'id': row.get('id', 'unknown'),
                                    'value': val * 1.15,
                                    'category': row.get('category', 'uncategorized'),
                                    'timestamp': datetime.now().isoformat(),
                                    'source': filename
                                }
                                if processed['category'] in ['premium', 'gold', 'platinum']:
                                    processed['value'] = processed['value'] * 1.25
                                if processed['value'] > 50000:
                                    processed['tier'] = 'high'
                                elif processed['value'] > 10000:
                                    processed['tier'] = 'medium'
                                else:
                                    processed['tier'] = 'low'
                                self.data.append(processed)
                            else:
                                if val <= 0:
                                    self.errors.append(f"Non-positive value in {filename}")
                                else:
                                    self.errors.append(f"Value too large in {filename}: {val}")
                        except:
                            self.errors.append(f"Could not parse row in {filename}")
            else:
                self.errors.append(f"Unknown file type: {filename}")
        except Exception as e:
            self.errors.append(f"Error processing {filename}: {str(e)}")

    def process_all(self):
        """Process all files in input directory."""
        for filename in os.listdir(self.input_dir):
            if filename.endswith('.json') or filename.endswith('.csv'):
                self.process_file(filename)
        self._calculate_stats()

    def _calculate_stats(self):
        """Calculate statistics from processed data."""
        if not self.data:
            self.stats = {'count': 0, 'total': 0, 'average': 0, 'by_category': {}, 'by_tier': {}}
            return

        total = 0
        by_category = {}
        by_tier = {'high': 0, 'medium': 0, 'low': 0}

        for item in self.data:
            total += item['value']
            cat = item['category']
            if cat not in by_category:
                by_category[cat] = {'count': 0, 'total': 0}
            by_category[cat]['count'] += 1
            by_category[cat]['total'] += item['value']
            by_tier[item['tier']] += 1

        self.stats = {
            'count': len(self.data),
            'total': total,
            'average': total / len(self.data),
            'by_category': by_category,
            'by_tier': by_tier,
            'error_count': len(self.errors)
        }

    def generate_report(self, format='json'):
        """Generate a report in the specified format."""
        if not self.stats:
            self._calculate_stats()

        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_items': self.stats['count'],
                'total_value': round(self.stats['total'], 2),
                'average_value': round(self.stats['average'], 2) if self.stats['count'] > 0 else 0,
                'error_count': self.stats.get('error_count', len(self.errors))
            },
            'category_breakdown': {},
            'tier_distribution': self.stats.get('by_tier', {}),
            'errors': self.errors[:10]  # Only first 10 errors
        }

        for cat, data in self.stats.get('by_category', {}).items():
            report['category_breakdown'][cat] = {
                'count': data['count'],
                'total': round(data['total'], 2),
                'average': round(data['total'] / data['count'], 2) if data['count'] > 0 else 0
            }

        if format == 'json':
            output_path = os.path.join(self.output_dir, 'report.json')
            with open(output_path, 'w') as f:
                json.dump(report, f, indent=2)
            return output_path
        elif format == 'csv':
            output_path = os.path.join(self.output_dir, 'report.csv')
            with open(output_path, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['Metric', 'Value'])
                writer.writerow(['Total Items', report['summary']['total_items']])
                writer.writerow(['Total Value', report['summary']['total_value']])
                writer.writerow(['Average Value', report['summary']['average_value']])
                writer.writerow(['Error Count', report['summary']['error_count']])
                writer.writerow([])
                writer.writerow(['Category', 'Count', 'Total', 'Average'])
                for cat, data in report['category_breakdown'].items():
                    writer.writerow([cat, data['count'], data['total'], data['average']])
            return output_path
        elif format == 'text':
            output_path = os.path.join(self.output_dir, 'report.txt')
            with open(output_path, 'w') as f:
                f.write("DATA PROCESSING REPORT\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Generated: {report['generated_at']}\n\n")
                f.write("SUMMARY\n")
                f.write("-" * 30 + "\n")
                f.write(f"Total Items: {report['summary']['total_items']}\n")
                f.write(f"Total Value: ${report['summary']['total_value']:,.2f}\n")
                f.write(f"Average Value: ${report['summary']['average_value']:,.2f}\n")
                f.write(f"Errors: {report['summary']['error_count']}\n\n")
                f.write("CATEGORY BREAKDOWN\n")
                f.write("-" * 30 + "\n")
                for cat, data in report['category_breakdown'].items():
                    f.write(f"{cat}: {data['count']} items, ${data['total']:,.2f} total\n")
                f.write("\nTIER DISTRIBUTION\n")
                f.write("-" * 30 + "\n")
                for tier, count in report['tier_distribution'].items():
                    f.write(f"{tier}: {count} items\n")
                if self.errors:
                    f.write("\nERRORS (first 10)\n")
                    f.write("-" * 30 + "\n")
                    for error in report['errors']:
                        f.write(f"- {error}\n")
            return output_path
        else:
            raise ValueError(f"Unknown format: {format}")

    def export_data(self, filename='processed_data.json'):
        """Export processed data to a file."""
        output_path = os.path.join(self.output_dir, filename)
        with open(output_path, 'w') as f:
            json.dump(self.data, f, indent=2)
        return output_path

    def get_items_by_tier(self, tier):
        """Get all items of a specific tier."""
        return [item for item in self.data if item.get('tier') == tier]

    def get_items_by_category(self, category):
        """Get all items of a specific category."""
        return [item for item in self.data if item.get('category') == category]

    def get_high_value_items(self, threshold=50000):
        """Get items above a value threshold."""
        return [item for item in self.data if item.get('value', 0) > threshold]

    def clear(self):
        """Clear all processed data and errors."""
        self.data = []
        self.errors = []
        self.stats = {}


# Quick test when run directly
if __name__ == '__main__':
    import tempfile
    import shutil

    # Create test directories
    input_dir = tempfile.mkdtemp()
    output_dir = tempfile.mkdtemp()

    # Create sample input file
    sample_data = [
        {'id': '1', 'value': 1000, 'category': 'standard'},
        {'id': '2', 'value': 5000, 'category': 'premium'},
        {'id': '3', 'value': 100000, 'category': 'gold'},
        {'id': '4', 'value': -50, 'category': 'standard'},  # Invalid
    ]

    with open(os.path.join(input_dir, 'test.json'), 'w') as f:
        json.dump(sample_data, f)

    # Process
    processor = DataProcessor(input_dir, output_dir)
    processor.process_all()

    # Generate reports
    processor.generate_report('json')
    processor.generate_report('text')

    print(f"Stats: {processor.stats}")
    print(f"Errors: {processor.errors}")

    # Cleanup
    shutil.rmtree(input_dir)
    shutil.rmtree(output_dir)
