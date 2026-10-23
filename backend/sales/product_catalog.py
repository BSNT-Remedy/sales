import re

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import connection


_TABLE_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _quoted_product_table():
    table = settings.SALES_PRODUCT_TABLE
    if not _TABLE_PATTERN.fullmatch(table):
        raise ImproperlyConfigured(
            "SALES_PRODUCT_TABLE must be a single MySQL table name containing "
            "only letters, numbers, and underscores."
        )
    return connection.ops.quote_name(table)


def _product(row):
    return {
        "id": row[0],
        "sku": row[1],
        "name": row[2],
        "category_id": row[3],
        "unit_price": row[4],
        "status": row[5],
    }


def search_products(search="", limit=25):
    table = _quoted_product_table()
    term = f"%{search.strip()}%"
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT id, sku, name, category_id, unit_price, status
            FROM {table}
            WHERE status = %s AND (name LIKE %s OR sku LIKE %s)
            ORDER BY name, id
            LIMIT %s
            """,
            ("active", term, term, limit),
        )
        return [_product(row) for row in cursor.fetchall()]


def get_product(product_id, *, for_update=False):
    table = _quoted_product_table()
    query = (
        f"SELECT id, sku, name, category_id, unit_price, status FROM {table} WHERE id = %s"
    )
    if for_update:
        query += " FOR UPDATE"
    with connection.cursor() as cursor:
        cursor.execute(query, (product_id,))
        row = cursor.fetchone()
    return _product(row) if row else None


def get_products_by_ids(product_ids):
    ids = list(dict.fromkeys(product_ids))
    if not ids:
        return {}

    table = _quoted_product_table()
    placeholders = ", ".join(["%s"] * len(ids))
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            SELECT id, sku, name, category_id, unit_price, status
            FROM {table}
            WHERE id IN ({placeholders})
            """,
            ids,
        )
        return {row[0]: _product(row) for row in cursor.fetchall()}
