import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Add, ArrowForward, FilterList, Search } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { getOrders } from '../services/sales';
import { SalesOrder } from '../types';

const currency = (value: string) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(Number(value));

const statusColor: Record<SalesOrder['status'], 'default' | 'success' | 'error' | 'info'> = {
  draft: 'default',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'info',
};

export default function SalesOrderListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getOrders({ page, status: status || undefined, order_number: query || undefined })
      .then((result) => {
        if (!active) return;
        setOrders(result.results);
        setCount(result.count);
        setHasNext(Boolean(result.next));
        setHasPrevious(Boolean(result.previous));
      })
      .catch(() => { if (active) setError('Could not load sales orders. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, status, query]);

  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <Box>
      <Box className="page-heading">
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>SALES ORDERS</Typography>
          <Typography variant="h4" fontWeight={800}>Order management</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>Track, review, and manage customer orders.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/orders/new')}>
          Create order
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper className="content-card" elevation={0}>
        <Box className="list-toolbar">
          <Box>
            <Typography variant="h6" fontWeight={750}>Sales orders</Typography>
            <Typography variant="body2" color="text.secondary">{count} total orders</Typography>
          </Box>
          <Box className="filter-controls">
            <TextField
              size="small"
              placeholder="Search order number"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              InputProps={{ startAdornment: <Search fontSize="small" color="action" sx={{ mr: 1 }} /> }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                label="Status"
                value={status}
                onChange={(event) => changeStatus(event.target.value)}
                startAdornment={<FilterList fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
              >
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ORDER</TableCell>
                <TableCell>CUSTOMER</TableCell>
                <TableCell>DATE</TableCell>
                <TableCell>ITEMS</TableCell>
                <TableCell align="right">TOTAL</TableCell>
                <TableCell>STATUS</TableCell>
                <TableCell width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 7 }}>
                  <CircularProgress size={28} />
                </TableCell></TableRow>
              )}
              {!loading && orders.map((order) => (
                <TableRow
                  hover
                  key={order.id}
                  className="clickable-row"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <TableCell>
                    <Typography fontWeight={750}>{order.order_number || `Draft #${order.id}`}</Typography>
                    <Typography variant="caption" color="text.secondary">ID {order.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={650}>{order.customer_name}</Typography>
                    <Typography variant="caption" color="text.secondary">Customer #{order.customer_id}</Typography>
                  </TableCell>
                  <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                  <TableCell>{order.items.length}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 750 }}>{currency(order.total_amount)}</TableCell>
                  <TableCell><Chip size="small" label={order.status} color={statusColor[order.status]} /></TableCell>
                  <TableCell><ArrowForward fontSize="small" color="action" /></TableCell>
                </TableRow>
              ))}
              {!loading && !orders.length && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 7 }}>
                  <Typography fontWeight={700}>No orders found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Try a different filter or create a sales order.
                  </Typography>
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
        <Box className="pagination-row">
          <Typography variant="body2" color="text.secondary">Page {page}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button disabled={!hasPrevious || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <Button disabled={!hasNext || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
