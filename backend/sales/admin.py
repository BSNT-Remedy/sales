from django.contrib import admin

from .models import Customer, SalesOrder, SalesOrderItem


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("customer_code", "customer_name", "email", "phone")
    search_fields = ("customer_code", "customer_name", "email")
    ordering = ("customer_name",)


class ReadOnlySalesAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SalesOrder)
class SalesOrderAdmin(ReadOnlySalesAdmin):
    list_display = (
        "order_number",
        "customer",
        "order_date",
        "total_amount",
        "status",
        "created_by",
    )
    list_filter = ("status", "order_date")
    search_fields = ("order_number", "customer__customer_name", "customer__customer_code")
    date_hierarchy = "order_date"
    ordering = ("-order_date", "-id")


@admin.register(SalesOrderItem)
class SalesOrderItemAdmin(ReadOnlySalesAdmin):
    list_display = (
        "id",
        "sales_order",
        "product_id",
        "quantity",
        "unit_price",
        "line_total",
        "created_at",
    )
    list_filter = ("created_at",)
    search_fields = ("sales_order__order_number", "product_id")
    ordering = ("-created_at", "-id")
