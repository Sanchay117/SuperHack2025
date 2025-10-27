import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthLayout } from '../components/AuthLayout';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useSocket } from '../lib/socket';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { ticketsAPI } from '../lib/api';
import { Plus, Filter } from 'lucide-react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    search: '',
  });

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  const { socket } = useSocket({
    'ticket:created': (data) => {
      toast.success('New ticket created!');
      setTickets(prev => [data, ...prev]);
    },
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setTickets(data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    
    try {
      await ticketsAPI.create(newTicket);
      toast.success('Ticket created successfully!');
      setShowModal(false);
      setNewTicket({ title: '', description: '', priority: 'medium' });
      fetchTickets();
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  const getFilteredTickets = () => {
    let filtered = [...tickets];

    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(t => t.priority === filters.priority);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.title?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
    },
    {
      key: 'title',
      label: 'Title',
      sortable: false,
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value) => (
        <span className={`badge badge-${value || 'medium'}`}>{value || 'medium'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`badge ${value === 'open' ? 'badge-high' : 'badge-success'}`}>
          {value || 'open'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value) => value ? format(new Date(value), 'MMM dd, HH:mm') : 'Unknown',
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
            <h1 className="text-3xl font-bold text-gray-900">Tickets</h1>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Create Ticket</span>
            </button>
          </div>

          {/* Filters */}
          <div className="card mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input w-full"
                >
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
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
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="card">
            <DataTable
              data={getFilteredTickets()}
              columns={columns}
              searchable={false}
              onRowClick={(row) => {
                setSelectedTicket(row);
                // Could show detail modal
              }}
            />
          </div>

          {/* Create Ticket Modal */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Create New Ticket"
          >
            <form onSubmit={createTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  required
                  className="input w-full"
                  placeholder="Enter ticket title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  required
                  rows={4}
                  className="input w-full"
                  placeholder="Enter ticket description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  className="input w-full"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary flex-1">
                  Create Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}

