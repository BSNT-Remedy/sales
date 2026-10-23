import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Add,
  DeleteOutline,
  Inventory2Outlined,
  Search,
  ShoppingCartOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { Customer, Product } from '../types';
import { createOrder, getCustomers, searchProducts } from '../services/sales';
import { normalizeQuantity } from '../utils/quantity';

interface OrderLine {
  product: Product;
  quantity: string;
}

function getApiErrorMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const data: unknown = error.response?.data;
  if (typeof data === 'string') return data;
  if (!data || typeof data !== 'object') return undefined;

  const messages: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === 'string') messages.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') {
      Object.values(value).forEach(collect);
    }
  };
  collect(data);
  return messages.length ? messages.join(' ') : undefined;
}

const money = (amount: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(amount);

export default function CreateSalesOrderPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoadingCustomers(true);
    getCustomers(customerSearch)
      .then((data) => { if (active) setCustomers(data); })
      .catch(() => { if (active) setError('Could not load customers. Please try again.'); })
      .finally(() => { if (active) setLoadingCustomers(false); });
    return () => { active = false; };
  }, [customerSearch]);

  useEffect(() => {
    let active = true;
    if (!productSearch.trim()) {
      setProducts([]);
      return () => { active = false; };
    }
    const timer = window.setTimeout(() => {
      setLoadingProducts(true);
      searchProducts(productSearch.trim())
        .then((data) => { if (active) setProducts(data); })
        .catch(() => { if (active) setError('Could not search products. Check the configured product API.'); })
        .finally(() => { if (active) setLoadingProducts(false); });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [productSearch]);

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.product.unit_price) * Number(line.quantity || 0), 0),
    [lines],
  );

  const addProduct = (product: Product) => {
    setLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) => line.product.id === product.id
          ? { ...line, quantity: (Number(line.quantity) + 1).toFixed(3) }
          : line);
      }
      return [...current, { product, quantity: '1.000' }];
    });
    setProductSearch('');
    setProducts([]);
  };

  const submit = async () => {
    if (!customer) {
      setError('Select a customer before creating the order.');
      return;
    }
    if (!lines.length) {
      setError('Add at least one product before creating the order.');
      return;
    }
    const items = lines.map((line) => ({
      product: line.product,
      quantity: normalizeQuantity(line.quantity),
    }));
    const orderItems: Array<{ product_id: number; quantity: string }> = [];
    for (const item of items) {
      if (item.quantity === null) {
        setError('Each item quantity must be at least 0.001 and have no more than three decimal places.');
        return;
      }
      orderItems.push({ product_id: item.product.id, quantity: item.quantity });
    }

    setSubmitting(true);
    setError('');
    try {
      const order = await createOrder(customer.id, orderItems);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err) || 'The order and its items could not be created. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>SALES ORDERS</Typography>
          <Typography variant="h4" fontWeight={800}>Create sales order</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Select a customer, add products, and review the order total.
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => navigate('/orders')}>Cancel</Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      <Paper className="content-card" elevation={0}>
        <Typography variant="h6" fontWeight={750}>Customer details</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Select the customer associated with this order.
        </Typography>
        <Autocomplete
          options={customers}
          value={customer}
          loading={loadingCustomers}
          inputValue={customerSearch}
          onInputChange={(_, value) => setCustomerSearch(value)}
          onChange={(_, value) => setCustomer(value)}
          getOptionLabel={(option) => `${option.customer_code} · ${option.customer_name}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Customer"
              placeholder="Search customer by name"
              required
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingCustomers && <CircularProgress size={18} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        {customer && (
          <Box className="customer-summary">
            <Typography fontWeight={700}>{customer.customer_name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'No contact information'}
            </Typography>
            {customer.address && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {customer.address}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      <Paper className="content-card" elevation={0} sx={{ mt: 2.5 }}>
        <Box className="section-title-row">
          <Box>
            <Typography variant="h6" fontWeight={750}>Order items</Typography>
            <Typography variant="body2" color="text.secondary">Search the catalog and add products.</Typography>
          </Box>
          <Typography className="item-count">{lines.length} {lines.length === 1 ? 'item' : 'items'}</Typography>
        </Box>
        <Autocomplete
          options={products}
          loading={loadingProducts}
          inputValue={productSearch}
          onInputChange={(_, value) => setProductSearch(value)}
          onChange={(_, value) => { if (value) addProduct(value); }}
          getOptionLabel={(option) => `${option.sku} · ${option.name}`}
          filterOptions={(options) => options}
          noOptionsText={productSearch ? 'No matching active products' : 'Type to search products'}
          renderOption={(props, product) => (
            <Box component="li" {...props} key={product.id} className="product-option">
              <Box className="product-icon"><Inventory2Outlined /></Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography fontWeight={650}>{product.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {product.sku} · Category {product.category_id}
                </Typography>
              </Box>
              <Typography fontWeight={700}>{money(Number(product.unit_price))}</Typography>
              <Add fontSize="small" color="primary" />
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search catalog by product name or SKU"
              InputProps={{
                ...params.InputProps,
                startAdornment: <><Search color="action" sx={{ ml: 1, mr: 0.5 }} />{params.InputProps.startAdornment}</>,
                endAdornment: (
                  <>
                    {loadingProducts && <CircularProgress size={18} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />

        <Box sx={{ overflowX: 'auto', mt: 2.5 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>PRODUCT</TableCell>
                <TableCell align="right">UNIT PRICE</TableCell>
                <TableCell align="center">QUANTITY</TableCell>
                <TableCell align="right">LINE TOTAL</TableCell>
                <TableCell width={52} />
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.product.id}>
                  <TableCell>
                    <Typography fontWeight={700}>{line.product.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{line.product.sku}</Typography>
                  </TableCell>
                  <TableCell align="right">{money(Number(line.product.unit_price))}</TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      size="small"
                      value={line.quantity}
                      onChange={(event) => setLines((current) => current.map((item) => item.product.id === line.product.id
                        ? { ...item, quantity: event.target.value }
                        : item))}
                      inputProps={{ min: 1, max: 999999999, step: 1, 'aria-label': `Quantity for ${line.product.name}` }}
                      sx={{ width: 112 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 750 }}>
                    {money(Number(line.product.unit_price) * Number(line.quantity || 0))}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      aria-label={`Remove ${line.product.name}`}
                      onClick={() => setLines((current) => current.filter((item) => item.product.id !== line.product.id))}
                    >
                      <DeleteOutline />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!lines.length && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box className="empty-items">
                      <ShoppingCartOutlined />
                      <Typography variant="body2" color="text.secondary">No products added yet</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <Box className="order-total-row">
          <Typography color="text.secondary">Estimated total</Typography>
          <Typography variant="h5" fontWeight={800}>{money(total)}</Typography>
        </Box>
      </Paper>

      <Paper className="content-card" elevation={0} sx={{ mt: 2.5 }}>
        <Box className="form-actions">
          <Button variant="outlined" onClick={() => navigate('/orders')}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <Add />}
          >
            {submitting ? 'Creating order…' : 'Create draft order'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
