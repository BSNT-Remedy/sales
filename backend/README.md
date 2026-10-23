# Sales Management API

This Django REST Framework application manages customers, sales orders, and order items. Its Sales models cover customer contact/address details and sales totals; billing-specific data is outside this app. Product data is read directly from an existing MySQL table. No Django Product app/model is installed, and the Sales app does not create a product table.

## Sales data fields

- Customers: `customer_code`, `customer_name`, `email`, `phone`, `address`.
- Sales orders: `order_number`, `customer_id`, `order_date`, `subtotal`, `total_amount`, `status`, `created_by`, `created_at`, `updated_at`.
- Sales order items: `sales_order_id`, `product_id`, `quantity`, `unit_price`, `line_total`, `created_at`. Product IDs refer to the external catalog and are not modeled as a Django foreign key.
- Order totals are recalculated from item line totals. Billing, discount, and tax fields are not part of this Sales app.

## Product catalog integration

The backend reads the existing MySQL `catalog_product` table directly using Django's configured database connection; it does not create or migrate this catalog table. The table must have `id`, `sku`, `name`, `category_id`, `unit_price`, and `status` columns as shown in the catalog schema. Only rows with `status="active"` are returned or accepted on an order. Set `SALES_PRODUCT_TABLE` if your table is named differently. The configured database user needs `SELECT` access to the table.

- The existing project uses Django’s `auth.User` unless `DJANGO_USER_MODEL` is set. Set the custom user model before the first project migration.
- The supplied settings are a standalone configuration example. Merge the Sales app, REST framework, JWT, database, and security settings into the existing project rather than replacing its settings if another Django project is already running.

## Configuration

Set these environment variables without committing credentials:

```text
DJANGO_SECRET_KEY=<long-random-secret>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=api.example.com
MYSQL_DATABASE=<database>
MYSQL_USER=<application-user>
MYSQL_PASSWORD=<secret>
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
SALES_PRODUCT_TABLE=catalog_product
DJANGO_USER_MODEL=auth.User
```

Install `requirements.txt`, then run `python manage.py migrate` and `python manage.py check --deploy`. The existing product table must be present in the configured MySQL database, but no product Django app or migration dependency is required.

Customer, sales order, and order item records are registered in Django admin. Customers can be managed there; sales orders and items are read-only in admin so order totals and status continue to be controlled by the Sales API workflow.

## Local login

There is no public registration endpoint. Users are created by a project administrator. For local development, set `DJANGO_DEBUG=true` in `backend/.env` and configure valid database credentials, then run these commands in PowerShell:

```powershell
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Enter the superuser's **username** (not email) and password in the frontend login form. Make sure the frontend and backend use the same database configuration. A Django superuser bypasses the Sales role-group checks; regular users must be assigned one of the Sales role groups. If you already created a user but forgot its password, run `python manage.py changepassword <username>`.

For local HTTP development, `SECURE_SSL_REDIRECT` defaults to off when `DJANGO_DEBUG=true`. Set `DJANGO_SECURE_SSL_REDIRECT=false` in `backend/.env` if HTTPS redirection is still enabled there. In production, use HTTPS and keep SSL redirection enabled.

## Roles

Create Django Groups named `Sales Representative`, `Sales Manager`, `Sales Administrator`, and `Sales Finance` (or override `SALES_ROLE_GROUPS`). Representatives manage their own draft orders; managers and administrators manage all drafts; finance can read all orders. All roles must be assigned explicitly. Customers can be read by each listed role; representatives, managers, and administrators can create/update customers. Only active products can be added to orders.

JWT credentials are issued at `POST /api/v1/auth/token/`; refresh tokens at `POST /api/v1/auth/token/refresh/`; revoke a refresh token at `POST /api/v1/auth/token/blacklist/`. Send access tokens as `Authorization: Bearer <token>`. The refresh-token blacklist app is enabled.

## API endpoints

- `/api/v1/customers/`
- `/api/v1/products/?search={term}` (active products from the existing MySQL table)
- `/api/v1/sales-orders/`
- `/api/v1/sales-orders/{id}/confirm/` and `/cancel/`
- `/api/v1/sales-order-items/?sales_order_id={order_id}`

Create an order with `{ "customer_id": 1 }`; add an item with `{ "sales_order_id": 1, "product_id": 2, "quantity": "2.000" }`. Unit prices come from the existing product and are not client-writable. Orders are created as drafts; confirmation requires at least one item. Deletion and item mutation are restricted to drafts.
