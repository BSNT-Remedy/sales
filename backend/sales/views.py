from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Customer, SalesOrder, SalesOrderItem
from .permissions import (
    CustomerPermission,
    ProductCatalogPermission,
    SalesOrderItemPermission,
    SalesOrderPermission,
    _has_role,
    can_manage_order,
    can_view_order,
)
from .serializers import (
    CustomerSerializer,
    SalesOrderItemReadSerializer,
    SalesOrderItemWriteSerializer,
    SalesOrderSerializer,
)
from . import services
from .product_catalog import search_products


class ProductCatalogView(APIView):
    permission_classes = (ProductCatalogPermission,)

    def get(self, request):
        return Response(search_products(request.query_params.get("search", "")))


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = (CustomerPermission,)
    queryset = Customer.objects.all()
    http_method_names = ("get", "post", "put", "patch", "head", "options")

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(customer_name__icontains=search.strip())
        return queryset


class SalesOrderViewSet(viewsets.ModelViewSet):
    serializer_class = SalesOrderSerializer
    permission_classes = (SalesOrderPermission,)
    queryset = SalesOrder.objects.select_related("customer", "created_by").prefetch_related("items")

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not (
            _has_role(user, "manager")
            or _has_role(user, "administrator")
            or _has_role(user, "finance")
        ):
            queryset = queryset.filter(created_by=user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        customer_id = (
            self.request.query_params.get("customer_id")
            or self.request.query_params.get("customer")
        )
        if customer_id:
            try:
                customer_id = int(customer_id)
            except ValueError as exc:
                raise ValidationError({"customer_id": "Must be a valid customer ID."}) from exc
            queryset = queryset.filter(customer_id=customer_id)
        order_number = self.request.query_params.get("order_number")
        if order_number:
            queryset = queryset.filter(order_number__icontains=order_number.strip())
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            date_from = parse_date(date_from)
            if date_from is None:
                raise ValidationError({"date_from": "Use YYYY-MM-DD format."})
            queryset = queryset.filter(order_date__date__gte=date_from)
        if date_to:
            date_to = parse_date(date_to)
            if date_to is None:
                raise ValidationError({"date_to": "Use YYYY-MM-DD format."})
            queryset = queryset.filter(order_date__date__lte=date_to)
        if date_from and date_to and date_from > date_to:
            raise ValidationError({"date_to": "Must not be earlier than date_from."})
        return queryset

    def perform_create(self, serializer):
        order = services.create_order(
            customer=serializer.validated_data["customer"],
            user=self.request.user,
        )
        serializer.instance = order

    def perform_update(self, serializer):
        order = services.update_order(
            order=serializer.instance,
            customer=serializer.validated_data.get("customer"),
        )
        serializer.instance = order

    def perform_destroy(self, instance):
        services.delete_order(order=instance)

    @action(detail=True, methods=("post",))
    def confirm(self, request, pk=None):
        order = self.get_object()
        order = services.confirm_order(order=order)
        return Response(self.get_serializer(order).data)

    @action(detail=True, methods=("post",))
    def cancel(self, request, pk=None):
        order = self.get_object()
        order = services.cancel_order(order=order)
        return Response(self.get_serializer(order).data)


class SalesOrderItemViewSet(viewsets.ModelViewSet):
    permission_classes = (SalesOrderItemPermission,)
    queryset = SalesOrderItem.objects.select_related("sales_order")

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return SalesOrderItemReadSerializer
        return SalesOrderItemWriteSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not (
            _has_role(user, "manager")
            or _has_role(user, "administrator")
            or _has_role(user, "finance")
        ):
            queryset = queryset.filter(sales_order__created_by=user)
        order_id = (
            self.request.query_params.get("sales_order_id")
            or self.request.query_params.get("order")
        )
        if order_id:
            try:
                order_id = int(order_id)
            except ValueError as exc:
                raise ValidationError({"sales_order_id": "Must be a valid order ID."}) from exc
            queryset = queryset.filter(sales_order_id=order_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.validated_data["sales_order"]
        if not can_manage_order(request.user, order):
            raise PermissionDenied("You cannot add items to this order.")
        item = services.create_order_item(
            order=order,
            product_id=serializer.validated_data["product_id"],
            quantity=serializer.validated_data["quantity"],
        )
        output = SalesOrderItemReadSerializer(item, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data.get("quantity", instance.quantity)
        item = services.update_order_item(
            item=instance,
            quantity=quantity,
            product_id=serializer.validated_data.get("product_id"),
        )
        return Response(
            SalesOrderItemReadSerializer(item, context=self.get_serializer_context()).data
        )

    def perform_destroy(self, instance):
        services.delete_order_item(item=instance)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response(
            SalesOrderItemReadSerializer(instance, context=self.get_serializer_context()).data
        )

    def list(self, request, *args, **kwargs):
        order_id = (
            request.query_params.get("sales_order_id")
            or request.query_params.get("order")
        )
        if order_id:
            try:
                order_id = int(order_id)
                order = SalesOrder.objects.get(pk=order_id)
            except (SalesOrder.DoesNotExist, ValueError) as exc:
                raise NotFound("Order not found.") from exc
            if not can_view_order(request.user, order):
                raise PermissionDenied("You cannot view items for this order.")
        return super().list(request, *args, **kwargs)
