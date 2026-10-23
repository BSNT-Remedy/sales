from django.conf import settings
from rest_framework.permissions import BasePermission

from .models import SalesOrder


def _has_role(user, role):
    if user.is_superuser:
        return True
    group_name = settings.SALES_ROLE_GROUPS[role]
    return user.groups.filter(name=group_name).exists()


def can_view_customers(user):
    return user.is_authenticated and any(
        _has_role(user, role)
        for role in ("representative", "manager", "administrator", "finance")
    )


def can_manage_customers(user):
    return user.is_authenticated and any(
        _has_role(user, role)
        for role in ("representative", "manager", "administrator")
    )


def can_view_order(user, order):
    if not user.is_authenticated:
        return False
    if _has_role(user, "administrator") or _has_role(user, "manager") or _has_role(user, "finance"):
        return True
    return _has_role(user, "representative") and order.created_by_id == user.pk


def can_manage_order(user, order):
    if not user.is_authenticated:
        return False
    if order.status != SalesOrder.Status.DRAFT:
        return False
    if _has_role(user, "administrator") or _has_role(user, "manager"):
        return True
    return _has_role(user, "representative") and order.created_by_id == user.pk


def can_cancel_order(user, order):
    if not user.is_authenticated:
        return False
    if order.status not in (SalesOrder.Status.DRAFT, SalesOrder.Status.CONFIRMED):
        return False
    if _has_role(user, "administrator") or _has_role(user, "manager"):
        return True
    return _has_role(user, "representative") and order.created_by_id == user.pk


class CustomerPermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return can_view_customers(request.user)
        return can_manage_customers(request.user)


class ProductCatalogPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and any(
            _has_role(user, role)
            for role in ("representative", "manager", "administrator", "finance")
        )


class SalesOrderPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return any(
                _has_role(user, role)
                for role in ("representative", "manager", "administrator", "finance")
            )
        return any(
            _has_role(user, role)
            for role in ("representative", "manager", "administrator")
        )

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return can_view_order(request.user, obj)
        if getattr(view, "action", None) == "cancel":
            return can_cancel_order(request.user, obj)
        return can_manage_order(request.user, obj)


class SalesOrderItemPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        return any(
            _has_role(user, role)
            for role in ("representative", "manager", "administrator", "finance")
        )

    def has_object_permission(self, request, view, obj):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return can_view_order(request.user, obj.sales_order)
        return can_manage_order(request.user, obj.sales_order)
