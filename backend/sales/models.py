from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class Customer(models.Model):
    customer_code = models.CharField(max_length=32, unique=True)
    customer_name = models.CharField(max_length=200, db_index=True)
    email = models.EmailField(max_length=254, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    address = models.TextField(blank=True)

    class Meta:
        ordering = ("customer_name", "id")
        permissions = [
            ("manage_sales_customers", "Can create and update sales customers"),
        ]

    def __str__(self):
        return f"{self.customer_code} - {self.customer_name}"


class SalesOrder(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    order_number = models.CharField(max_length=32, unique=True, null=True, blank=True)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name="sales_orders",
    )
    order_date = models.DateTimeField(default=timezone.now, db_index=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_sales_orders",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-order_date", "-id")
        indexes = [
            models.Index(fields=("customer", "order_date"), name="sales_order_cust_date"),
            models.Index(fields=("status", "order_date"), name="sales_order_status_date"),
        ]
        permissions = [
            ("view_all_sales_orders", "Can view all sales orders"),
            ("manage_all_sales_orders", "Can manage all sales orders"),
        ]

    def __str__(self):
        return self.order_number or f"Order {self.pk or 'unsaved'}"


class SalesOrderItem(models.Model):
    sales_order = models.ForeignKey(
        SalesOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product_id = models.BigIntegerField()
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("id",)
        indexes = [
            models.Index(fields=("sales_order", "id"), name="sales_item_order_id"),
            models.Index(fields=("product_id",), name="sales_item_product"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="sales_item_quantity_positive",
            ),
            models.CheckConstraint(
                condition=Q(unit_price__gte=0) & Q(line_total__gte=0),
                name="sales_item_amounts_nonnegative",
            ),
        ]

    def __str__(self):
        return f"Product {self.product_id} x {self.quantity}"
