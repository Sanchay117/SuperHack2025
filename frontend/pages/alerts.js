import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthLayout } from '../components/AuthLayout';
import { DataTable } from '../components/DataTable';
import { useSocket } from '../lib/socket';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { ticketsAPI } from '../lib/api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: 'all',
    handled: 'all',
    search: '',
  });

  const { socket } = useSocket({
    'alert:created': (data) => {
      toast.success('New alert received!');
      setAlerts(prev => [data, ...prev]);
    },
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    filterAlerts();
  }, [alerts, filters]);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const filterAlerts = () => {
    let filtered = [...alerts];

    if (filters.severity !== 'all') {
      filtered = filtered.filter(a => a.severity === filters.severity);
    }

    if (filters.handled !== 'all') {
      filtered = filtered.filter(a => 
        filters.handled === 'handled' ? a.handled : !a.handled
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.summary?.toLowerCase().includes(searchLower) ||
        a.source?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAlerts(filtered);
  };

  const createTicketFromAlert = async (alert) => {
    try {
      await ticketsAPI.create({
        title: `Alert: ${alert.summary}`,
        description: alert.details ? JSON.stringify(alert.details) : alert.summary,
        priority: alert.severity || 'medium',
      });
      toast.success('Ticket created from alert');
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  const columns = [
    {
      key: 'severity',
      label: 'Severity',
      sortable: true,
      render: (value) => (
        <span className={`badge badge-${value || 'medium'}`}>{value || 'medium'}</span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
    },
    {
      key: 'summary',
      label: 'Summary',
      sortable: false,
    },
    {
      key: 'created_at',
      label: 'Time',
      sortable: true,
      render: (value) => value ? format(new Date(value), 'MMM dd, HH:mm') : 'Unknown',
    },
    {
      key: 'handled',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={value ? 'badge badge-success' : 'badge badge-high'}>
          {value ? 'Handled' : 'Unhandled'}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <ProtectedRoute>
        <AuthLayout>
          <div>Loading...</div>
        </AuthLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AuthLayout>
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
          </div>

          {/* Filters */}
          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="input w-full"
                >
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.handled}
                  onChange={(e) => setFilters({ ...filters, handled: e.target.value })}
                  className="input w-full"
                >
                  <option value="all">All</option>
                  <option value="unhandled">Unhandled</option>
                  <option value="handled">Handled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="card">
            <DataTable
              data={filteredAlerts}
              columns={columns}
              searchable={false}
              onRowClick={(row) => {
                // Show detail in modal or navigate
                toast.info(`Alert #${row.id}: ${row.summary}`);
              }}
              actions={(row) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    createTicketFromAlert(row);
                  }}
                  className="btn btn-primary text-xs"
                >
                  Create Ticket
                </button>
              )}
            />
          </div>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}

