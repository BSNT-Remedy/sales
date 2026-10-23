from rest_framework import serializers

from .models import Customer, SalesOrder, SalesOrderItem
from .product_catalog import get_products_by_ids


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ("id", "customer_code", "customer_name", "email", "phone", "address")
        read_only_fields = ("id",)

    def validate_customer_code(self, value):
        return value.strip().upper()


class SalesOrderSerializer(serializers.ModelSerializer):
    customer_id = serializers.PrimaryKeyRelatedField(
        source="customer",
        queryset=Customer.objects.all(),
    )
    customer_name = serializers.CharField(source="customer.customer_name", read_only=True)
    customer_email = serializers.EmailField(source="customer.email", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    customer_address = serializers.CharField(source="customer.address", read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = SalesOrder
        fields = (
            "id",
            "order_number",
            "customer_id",
            "customer_name",
            "customer_email",
            "customer_phone",
            "customer_address",
            "order_date",
            "subtotal",
            "total_amount",
            "status",
            "created_by",
            "created_at",
            "updated_at",
            "items",
        )
        read_only_fields = (
            "id",
            "order_number",
            "customer_name",
            "customer_email",
            "customer_phone",
            "customer_address",
            "order_date",
            "subtotal",
            "total_amount",
            "status",
            "created_by",
            "created_at",
            "updated_at",
            "items",
        )

    def get_items(self, order):
        return SalesOrderItemReadSerializer(order.items.all(), many=True).data


class SalesOrderItemListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        items = list(data.all() if hasattr(data, "all") else data)
        self.child.context["products_by_id"] = get_products_by_ids(
            item.product_id for item in items
        )
        return super().to_representation(items)


class SalesOrderItemReadSerializer(serializers.ModelSerializer):
    sales_order_id = serializers.IntegerField(read_only=True)
    product_id = serializers.IntegerField(read_only=True)
    product_name = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()

    class Meta:
        model = SalesOrderItem
        fields = (
            "id",
            "sales_order_id",
            "product_id",
            "product_name",
            "product_sku",
            "quantity",
            "unit_price",
            "line_total",
            "created_at",
        )
        read_only_fields = fields
        list_serializer_class = SalesOrderItemListSerializer

    def _product(self, item):
        products = self.context.get("products_by_id")
        if products is None:
            products = get_products_by_ids([item.product_id])
        return products.get(item.product_id, {})

    def get_product_name(self, item):
        return self._product(item).get("name", "Unavailable product")

    def get_product_sku(self, item):
        return self._product(item).get("sku", "")


class SalesOrderItemWriteSerializer(serializers.ModelSerializer):
    sales_order_id = serializers.PrimaryKeyRelatedField(
        source="sales_order",
        queryset=SalesOrder.objects.all(),
        write_only=True,
        required=True,
    )
    product_id = serializers.IntegerField(min_value=1, required=True)

    class Meta:
        model = SalesOrderItem
        fields = ("sales_order_id", "product_id", "quantity")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance is not None:
            self.fields["sales_order_id"].read_only = True

    def validate(self, attrs):
        if self.instance is not None:
            attrs.pop("sales_order", None)
        return attrs
