from rest_framework.routers import DefaultRouter
from django.urls import path

from .views import (
    CustomerViewSet,
    ProductCatalogView,
    SalesOrderItemViewSet,
    SalesOrderViewSet,
)


router = DefaultRouter()
router.register("customers", CustomerViewSet, basename="customer")
router.register("sales-orders", SalesOrderViewSet, basename="sales-order")
router.register("sales-order-items", SalesOrderItemViewSet, basename="sales-order-item")

urlpatterns = [
    path("products/", ProductCatalogView.as_view(), name="product-catalog"),
] + router.urls
