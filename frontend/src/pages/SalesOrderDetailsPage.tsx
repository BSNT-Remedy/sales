import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowBack, CheckCircleOutline, DeleteOutline, EditOutlined } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { confirmOrder, deleteOrderItem, getOrder, updateOrderItemQuantity } from '../services/sales';
import { SalesOrder } from '../types';
import { normalizeQuantity } from '../utils/quantity';

const currency = (value: string | number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(Number(value));

export default function SalesOrderDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState<number | null>(null);
  const [quantityEdits, setQuantityEdits] = useState<Record<number, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      setOrder(await getOrder(id));
    } catch {
      setError('Could not load this order. It may not exist or you may not have access.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void loadOrder(); }, [loadOrder]);

  const handleQuantity = async (itemId: number, quantity: string) => {
    const normalized = normalizeQuantity(quantity);
    if (!normalized) {
      setError('Quantity must be at least 0.001 and have no more than three decimal places.');
      return;
    }
    setSavingItem(itemId);
    setError('');
    try {
      const updatedItem = await updateOrderItemQuantity(itemId, normalized);
      await loadOrder();
      setQuantityEdits((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
      setSuccess('Item quantity updated.');
      if (updatedItem.quantity !== quantity) {
        setQuantityEdits((current) => ({ ...current, [itemId]: updatedItem.quantity }));
      }
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail || 'Unable to update quantity.'
        : 'Unable to update quantity.');
    } finally {
      setSavingItem(null);
    }
  };

  const removeItem = async (itemId: number) => {
    setError('');
    try {
      await deleteOrderItem(itemId);
      await loadOrder();
      setSuccess('Item removed from draft.');
    } catch {
      setError('Unable to remove the item. Only draft orders can be changed.');
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    setConfirming(true);
    setError('');
    try {
      setOrder(await confirmOrder(order.id));
      setSuccess('Order confirmed successfully.');
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? (err.response?.data as { detail?: string; items?: string } | undefined)?.detail
          || (err.response?.data as { items?: string } | undefined)?.items
          || 'Unable to confirm this order.'
        : 'Unable to confirm this order.');
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return <Box className="center-state"><CircularProgress /></Box>;
  }
  if (!order) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Order not found.'}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/orders')}>Back to orders</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate('/orders')} sx={{ mb: 2 }}>All orders</Button>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
      <Box className="page-heading">
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>ORDER DETAILS</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" fontWeight={800}>{order.order_number || `Draft #${order.id}`}</Typography>
            <Chip size="small" label={order.status} />
          </Box>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Created {new Date(order.order_date).toLocaleString()}
          </Typography>
        </Box>
        {order.status === 'draft' && (
          <Button
            variant="contained"
            startIcon={<CheckCircleOutline />}
            disabled={confirming || !order.items.length}
            onClick={handleConfirm}
          >
            {confirming ? 'Confirming…' : 'Confirm order'}
          </Button>
        )}
      </Box>

      <Box className="details-grid">
        <Paper className="content-card" elevation={0}>
          <Typography variant="h6" fontWeight={750} sx={{ mb: 2 }}>Customer</Typography>
          <Typography fontWeight={700}>{order.customer_name}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {[order.customer_email, order.customer_phone].filter(Boolean).join(' · ') || 'No contact information'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {order.customer_address || 'No address on file'}
          </Typography>
        </Paper>
        <Paper className="content-card" elevation={0}>
          <Typography variant="h6" fontWeight={750} sx={{ mb: 2 }}>Order summary</Typography>
          <Box className="summary-line"><Typography color="text.secondary">Subtotal</Typography><Typography>{currency(order.subtotal)}</Typography></Box>
          <Box className="summary-line total"><Typography fontWeight={750}>Total</Typography><Typography fontWeight={800}>{currency(order.total_amount)}</Typography></Box>
        </Paper>
      </Box>

      <Paper className="content-card" elevation={0} sx={{ mt: 2.5 }}>
        <Box className="section-title-row">
          <Box>
            <Typography variant="h6" fontWeight={750}>Items</Typography>
            <Typography variant="body2" color="text.secondary">
              {order.status === 'draft' ? 'Edit quantities or remove items while this order is a draft.' : 'Items are read-only after confirmation.'}
            </Typography>
          </Box>
          {order.status === 'draft' && <EditOutlined color="action" />}
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead><TableRow>
              <TableCell>PRODUCT</TableCell>
              <TableCell align="right">UNIT PRICE</TableCell>
              <TableCell align="center">QUANTITY</TableCell>
              <TableCell align="right">LINE TOTAL</TableCell>
              {order.status === 'draft' && <TableCell width={52} />}
            </TableRow></TableHead>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Typography fontWeight={700}>{item.product_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.product_sku}</Typography>
                  </TableCell>
                  <TableCell align="right">{currency(item.unit_price)}</TableCell>
                  <TableCell align="center">
                    {order.status === 'draft' ? (
                      <TextField
                        type="number"
                        size="small"
                        value={quantityEdits[item.id] ?? item.quantity}
                        disabled={savingItem === item.id}
                        onChange={(event) => setQuantityEdits((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))}
                        onBlur={(event) => {
                          if (event.target.value !== item.quantity) void handleQuantity(item.id, event.target.value);
                        }}
                        inputProps={{ min: 0.001, max: 999999999.999, step: 0.001, 'aria-label': `Quantity for ${item.product_name}` }}
                        sx={{ width: 112 }}
                      />
                    ) : item.quantity}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 750 }}>{currency(item.line_total)}</TableCell>
                  {order.status === 'draft' && (
                    <TableCell>
                      <IconButton size="small" aria-label={`Remove ${item.product_name}`} onClick={() => void removeItem(item.id)}>
                        <DeleteOutline />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {!order.items.length && (
                <TableRow><TableCell colSpan={order.status === 'draft' ? 5 : 4} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">This order has no items yet.</Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
}
