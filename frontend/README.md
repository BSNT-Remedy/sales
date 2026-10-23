# Sales Desk frontend

React + TypeScript frontend for the Django Sales Management API.

## Run locally

```powershell
cd frontend
npm install
npm run dev
```

The Vite development server proxies `/api` to `http://localhost:8000`. Copy `.env.example` to `.env` to override the API base URL.

## Backend integration

- `VITE_API_BASE_URL` defaults to `/api/v1`.
- The frontend searches the backend's authenticated `/products/` endpoint. The backend reads active products directly from the existing MySQL `catalog_product` table (including product name, SKU, category ID, and price); no Django Product app or Product model is required.
- The Sales API uses the simplified customer, order, and order-item models. Order creation sends `customer_id`; item creation sends `sales_order_id` and `product_id`. Order responses expose customer contact/address details and recalculated subtotal/total amounts without billing fields.
- The Sales API uses JWT access/refresh tokens. Access tokens are sent as Bearer credentials, refreshed on an expired-token response, and refresh tokens are blacklisted on sign-out.
- The order workflow submits the draft and all selected items in one request. The backend creates them in a database transaction, recalculates totals, and rolls the whole creation back if any item is invalid.

For a deployed frontend served from a different origin, configure the Django deployment's CORS policy to allow that origin. Do not enable permissive CORS for production.

## Structure

```text
src/
  components/     Shared layout and authenticated-route guard
  contexts/       Authentication state
  pages/          Login, order creation, list, and details
  services/       Axios client, token storage, and Sales API calls
  App.tsx         React Router route tree
  theme.ts        Material UI theme
  types.ts        API data contracts
```
