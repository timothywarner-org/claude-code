#!/usr/bin/env python
"""
Data Pipeline Module - ETL for customer analytics
Written: 2015 | Maintained by: nobody (original author left in 2017)

This processes customer data from CSV exports and loads into reporting DB.
Runs nightly via cron. Takes about 4 hours for full dataset.
TODO: Make this faster (ticket PERF-2234, opened 2018)

WARNING: Don't run this during business hours - it locks the database
"""

import csv
import time
import json
import sqlite3
import urllib2  # Python 2 import - breaks on Python 3
import os
import sys

# Configuration - scattered throughout because we kept adding stuff
SOURCE_DIR = "/data/exports/"
OUTPUT_DB = "/data/analytics.db"
BATCH_SIZE = 100
MAX_ERRORS = 50
LOG_FILE = "/var/log/pipeline.log"

# Global counters - for monitoring
_records_processed = 0
_records_failed = 0
_start_time = None

# Supported file types and their parsers
FILE_TYPES = {
    "customers": "parse_customers",
    "orders": "parse_orders",
    "products": "parse_products",
    "events": "parse_events"
}


def log_message(message):
    """Write to log file"""
    global LOG_FILE
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    line = "[%s] %s\n" % (timestamp, message)
    print(line)  # Also print to stdout
    try:
        f = open(LOG_FILE, "a")
        f.write(line)
        f.close()
    except:
        pass  # Silently fail logging - what could go wrong?


def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(OUTPUT_DB)
    conn.text_factory = str  # Handle encoding issues... poorly
    return conn


def init_database():
    """Create tables if they don't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Customers table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY,
            external_id TEXT,
            name TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            created_date TEXT,
            segment TEXT,
            lifetime_value REAL
        )
    ''')

    # Orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY,
            order_id TEXT,
            customer_id TEXT,
            order_date TEXT,
            total_amount REAL,
            status TEXT,
            items TEXT
        )
    ''')

    conn.commit()
    conn.close()


def read_csv_file(filepath):
    """Read CSV file and return rows
    # NOTE: Loads entire file into memory - crashes on large files
    # See ticket MEM-1123 (2019)
    """
    rows = []
    f = open(filepath, "r")
    reader = csv.DictReader(f)
    for row in reader:
        rows.append(row)
    f.close()
    return rows


def clean_string(value):
    """Clean and normalize string values"""
    if value is None:
        return ""
    value = str(value)
    value = value.strip()
    value = value.replace("\n", " ")
    value = value.replace("\r", "")
    value = value.replace("\t", " ")
    # Remove non-ASCII - brutal but effective
    clean = ""
    for char in value:
        if ord(char) < 128:
            clean = clean + char
    return clean


def parse_date(date_string):
    """Parse date string to standard format
    # HACK: We get dates in like 15 different formats
    """
    if not date_string:
        return None

    date_string = str(date_string).strip()

    # Try different formats - add more as we discover them
    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%m-%d-%Y",
        "%d-%m-%Y",
        "%Y%m%d",
        "%B %d, %Y",
        "%b %d, %Y"
    ]

    for fmt in formats:
        try:
            import datetime
            dt = datetime.datetime.strptime(date_string, fmt)
            return dt.strftime("%Y-%m-%d")
        except:
            continue

    # Give up and return as-is
    return date_string


def validate_email(email):
    """Basic email validation"""
    if not email:
        return False
    email = str(email).strip()
    if "@" not in email:
        return False
    if "." not in email.split("@")[1]:
        return False
    return True


def calculate_lifetime_value(customer_id, orders):
    """Calculate customer lifetime value from orders
    # This is O(n*m) and slow - needs optimization
    """
    total = 0.0
    for order in orders:
        if order.get("customer_id") == customer_id:
            try:
                amount = float(order.get("total_amount", 0))
                total = total + amount
            except:
                pass
    return total


def process_customers(filepath, orders_data):
    """Process customers CSV file"""
    global _records_processed, _records_failed

    log_message("Processing customers from %s" % filepath)

    rows = read_csv_file(filepath)
    log_message("Loaded %d customer records" % len(rows))

    conn = get_db_connection()
    cursor = conn.cursor()

    processed = 0
    failed = 0
    batch = []

    for row in rows:
        try:
            # Extract and clean fields
            external_id = clean_string(row.get("id", row.get("customer_id", "")))
            name = clean_string(row.get("name", row.get("customer_name", "")))
            email = clean_string(row.get("email", ""))
            phone = clean_string(row.get("phone", row.get("telephone", "")))
            address = clean_string(row.get("address", ""))
            created = parse_date(row.get("created_date", row.get("signup_date", "")))
            segment = clean_string(row.get("segment", row.get("customer_type", "unknown")))

            # Validate
            if not external_id:
                failed = failed + 1
                continue

            if not validate_email(email):
                email = ""  # Clear invalid emails

            # Calculate LTV - slow!
            ltv = calculate_lifetime_value(external_id, orders_data)

            record = (external_id, name, email, phone, address, created, segment, ltv)
            batch.append(record)

            # Insert in batches
            if len(batch) >= BATCH_SIZE:
                cursor.executemany('''
                    INSERT OR REPLACE INTO customers
                    (external_id, name, email, phone, address, created_date, segment, lifetime_value)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', batch)
                conn.commit()
                batch = []

            processed = processed + 1

        except Exception as e:
            failed = failed + 1
            log_message("Error processing customer: %s" % str(e))
            if failed > MAX_ERRORS:
                log_message("Too many errors, aborting")
                break

    # Final batch
    if len(batch) > 0:
        cursor.executemany('''
            INSERT OR REPLACE INTO customers
            (external_id, name, email, phone, address, created_date, segment, lifetime_value)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', batch)
        conn.commit()

    conn.close()

    _records_processed = _records_processed + processed
    _records_failed = _records_failed + failed

    log_message("Customers done: %d processed, %d failed" % (processed, failed))


def process_orders(filepath):
    """Process orders CSV file"""
    global _records_processed, _records_failed

    log_message("Processing orders from %s" % filepath)

    rows = read_csv_file(filepath)
    log_message("Loaded %d order records" % len(rows))

    conn = get_db_connection()
    cursor = conn.cursor()

    processed = 0
    failed = 0

    for row in rows:
        try:
            order_id = clean_string(row.get("order_id", row.get("id", "")))
            customer_id = clean_string(row.get("customer_id", ""))
            order_date = parse_date(row.get("order_date", row.get("date", "")))

            # Parse amount - handle currency symbols
            amount_str = str(row.get("total", row.get("amount", "0")))
            amount_str = amount_str.replace("$", "").replace(",", "").strip()
            try:
                total_amount = float(amount_str)
            except:
                total_amount = 0.0

            status = clean_string(row.get("status", "unknown"))

            # Items might be JSON or comma-separated
            items_raw = row.get("items", row.get("line_items", ""))
            if items_raw:
                try:
                    items = json.dumps(json.loads(items_raw))
                except:
                    items = items_raw
            else:
                items = ""

            cursor.execute('''
                INSERT OR REPLACE INTO orders
                (order_id, customer_id, order_date, total_amount, status, items)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (order_id, customer_id, order_date, total_amount, status, items))

            processed = processed + 1

            # Commit every N records - not ideal but prevents data loss
            if processed % BATCH_SIZE == 0:
                conn.commit()

        except Exception as e:
            failed = failed + 1
            log_message("Error processing order: %s" % str(e))

    conn.commit()
    conn.close()

    _records_processed = _records_processed + processed
    _records_failed = _records_failed + failed

    log_message("Orders done: %d processed, %d failed" % (processed, failed))

    return rows  # Return for customer LTV calculation


def run_pipeline():
    """Main pipeline entry point"""
    global _start_time, _records_processed, _records_failed

    _start_time = time.time()
    _records_processed = 0
    _records_failed = 0

    log_message("=" * 50)
    log_message("Starting data pipeline")
    log_message("=" * 50)

    # Initialize database
    init_database()

    # Find source files
    orders_file = None
    customers_file = None

    # Look for files - messy because naming is inconsistent
    for filename in os.listdir(SOURCE_DIR):
        filepath = os.path.join(SOURCE_DIR, filename)
        if not os.path.isfile(filepath):
            continue
        if not filename.endswith(".csv"):
            continue

        lower = filename.lower()
        if "order" in lower:
            orders_file = filepath
        elif "customer" in lower or "user" in lower:
            customers_file = filepath

    # Process in order - orders first for LTV calc
    orders_data = []
    if orders_file:
        orders_data = process_orders(orders_file)
    else:
        log_message("WARNING: No orders file found")

    if customers_file:
        process_customers(customers_file, orders_data)
    else:
        log_message("WARNING: No customers file found")

    # Calculate runtime
    elapsed = time.time() - _start_time
    hours = int(elapsed / 3600)
    minutes = int((elapsed % 3600) / 60)
    seconds = int(elapsed % 60)

    log_message("=" * 50)
    log_message("Pipeline complete")
    log_message("Runtime: %dh %dm %ds" % (hours, minutes, seconds))
    log_message("Records processed: %d" % _records_processed)
    log_message("Records failed: %d" % _records_failed)
    log_message("=" * 50)


if __name__ == "__main__":
    run_pipeline()
