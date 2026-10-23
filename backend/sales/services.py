from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import Customer, SalesOrder, SalesOrderItem
from .product_catalog import get_product, get_products_by_ids


CENT = Decimal("0.01")


def _money(value):
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def _active_product(product):
    if product is None:
        raise ValidationError({"product_id": "Product does not exist."})
    status = str(product["status"]).strip().casefold()
    if status != "active":
        raise ValidationError({"product_id": "Only active products can be added to an order."})
    return product


@transaction.atomic
def create_order(*, customer, user, items=()):
    customer = Customer.objects.select_for_update().get(pk=customer.pk)
    order = SalesOrder.objects.create(
        customer=customer,
        created_by=user,
    )
    for item in items:
        _create_order_item(
            order=order,
            product_id=item["product_id"],
            quantity=item["quantity"],
        )
    if items:
        recalculate_order_totals(order)
    return order


@transaction.atomic
def update_order(*, order, customer=None):
    order = SalesOrder.objects.select_for_update().get(pk=order.pk)
    _require_draft(order)
    if customer is not None and customer.pk != order.customer_id:
        order.customer = Customer.objects.select_for_update().get(pk=customer.pk)
        order.save(update_fields=("customer", "updated_at"))
    return order


def _require_draft(order):
    if order.status != SalesOrder.Status.DRAFT:
        raise ValidationError({"status": "Only draft orders can be changed."})


def recalculate_order_totals(order):
    total = sum(
        (_money(item.quantity * item.unit_price) for item in order.items.all()),
        Decimal("0.00"),
    )
    order.subtotal = _money(total)
    order.total_amount = _money(total)
    order.save(update_fields=("subtotal", "total_amount", "updated_at"))


def _create_order_item(*, order, product_id, quantity):
    product = _active_product(get_product(product_id, for_update=True))
    unit_price = Decimal(str(product["unit_price"]))
    return SalesOrderItem.objects.create(
        sales_order=order,
        product_id=product["id"],
        quantity=quantity,
        unit_price=unit_price,
        line_total=_money(Decimal(quantity) * unit_price),
    )


@transaction.atomic
def create_order_item(*, order, product_id, quantity):
    order = SalesOrder.objects.select_for_update().get(pk=order.pk)
    _require_draft(order)
    item = _create_order_item(order=order, product_id=product_id, quantity=quantity)
    recalculate_order_totals(order)
    return item


@transaction.atomic
def update_order_item(*, item, quantity, product_id=None):
    item = SalesOrderItem.objects.select_for_update().select_related("sales_order").get(pk=item.pk)
    order = SalesOrder.objects.select_for_update().get(pk=item.sales_order_id)
    _require_draft(order)
    update_fields = ["quantity", "line_total"]
    if product_id is not None and product_id != item.product_id:
        product = _active_product(get_product(product_id, for_update=True))
        item.product_id = product["id"]
        item.unit_price = Decimal(str(product["unit_price"]))
        update_fields.extend(("product_id", "unit_price"))
    item.quantity = quantity
    item.line_total = _money(Decimal(quantity) * item.unit_price)
    item.save(update_fields=update_fields)
    recalculate_order_totals(order)
    return item


@transaction.atomic
def delete_order_item(*, item):
    item = SalesOrderItem.objects.select_for_update().select_related("sales_order").get(pk=item.pk)
    order = SalesOrder.objects.select_for_update().get(pk=item.sales_order_id)
    _require_draft(order)
    item.delete()
    recalculate_order_totals(order)


@transaction.atomic
def confirm_order(*, order):
    order = SalesOrder.objects.select_for_update().get(pk=order.pk)
    _require_draft(order)
    if not order.items.exists():
        raise ValidationError({"items": "An order must contain at least one item before confirmation."})
    products = get_products_by_ids(order.items.values_list("product_id", flat=True))
    for item in order.items.all():
        _active_product(products.get(item.product_id))
    order.status = SalesOrder.Status.CONFIRMED
    order.save(update_fields=("status", "updated_at"))
    return order


@transaction.atomic
def cancel_order(*, order):
    order = SalesOrder.objects.select_for_update().get(pk=order.pk)
    if order.status not in (SalesOrder.Status.DRAFT, SalesOrder.Status.CONFIRMED):
        raise ValidationError({"status": "Only draft or confirmed orders can be cancelled."})
    order.status = SalesOrder.Status.CANCELLED
    order.save(update_fields=("status", "updated_at"))
    return order


@transaction.atomic
def delete_order(*, order):
    order = SalesOrder.objects.select_for_update().get(pk=order.pk)
    _require_draft(order)
    order.delete()
