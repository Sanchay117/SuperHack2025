import { useEffect, useState } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthLayout } from '../components/AuthLayout';
import { useSocket } from '../lib/socket';
import { AlertTriangle, Ticket, Bot, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    openTickets: 0,
    criticalAlerts: 0,
    queuedActions: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);

  const handleSocketEvent = (event, data) => {
    console.log('Socket event:', event, data);
    
    if (event === 'alert:created') {
      toast.success('New alert received!');
      setStats(prev => ({ ...prev, criticalAlerts: prev.criticalAlerts + 1 }));
      setRecentAlerts(prev => [data, ...prev.slice(0, 9)]);
    }
    
    if (event === 'ticket:created') {
      toast.success('New ticket created!');
      setStats(prev => ({ ...prev, openTickets: prev.openTickets + 1 }));
      setRecentTickets(prev => [data, ...prev.slice(0, 9)]);
    }
    
    if (event === 'action:updated') {
      setStats(prev => ({ ...prev, queuedActions: Math.max(0, prev.queuedActions - 1) }));
    }
  };

  const { socket, connected } = useSocket({
    'alert:created': (data) => handleSocketEvent('alert:created', data),
    'ticket:created': (data) => handleSocketEvent('ticket:created', data),
    'action:updated': (data) => handleSocketEvent('action:updated', data),
  });

  useEffect(() => {
    // Load initial data
    fetch('/api/alerts')
      .then(res => res.json())
      .then(data => {
        setRecentAlerts(data.slice(0, 10));
        setStats(prev => ({ ...prev, criticalAlerts: data.filter(a => !a.handled && a.severity === 'critical').length }));
      })
      .catch(console.error);

    fetch('/api/tickets?limit=10')
      .then(res => res.json())
      .then(data => {
        setRecentTickets(data);
        setStats(prev => ({ ...prev, openTickets: data.filter(t => t.status === 'open').length }));
      })
      .catch(console.error);
  }, []);

  return (
    <ProtectedRoute>
      <AuthLayout>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Open Tickets</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.openTickets}</p>
                </div>
                <Ticket className="text-primary-600" size={40} />
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Critical Alerts</p>
                  <p className="text-3xl font-bold text-red-600">{stats.criticalAlerts}</p>
                </div>
                <AlertCircle className="text-red-600" size={40} />
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Queued Actions</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.queuedActions}</p>
                </div>
                <Bot className="text-orange-600" size={40} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Alerts */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="mr-2 text-orange-600" size={24} />
                Recent Alerts
              </h2>
              <div className="space-y-3">
                {recentAlerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent alerts</p>
                ) : (
                  recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className={`badge badge-${alert.severity || 'medium'}`}>
                        {alert.severity || 'medium'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {alert.summary || 'No summary'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {alert.created_at ? format(new Date(alert.created_at), 'MMM dd, HH:mm') : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Ticket className="mr-2 text-primary-600" size={24} />
                Recent Tickets
              </h2>
              <div className="space-y-3">
                {recentTickets.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent tickets</p>
                ) : (
                  recentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{ticket.title}</p>
                        <p className="text-xs text-gray-500">
                          {ticket.created_at ? format(new Date(ticket.created_at), 'MMM dd, HH:mm') : 'Unknown'}
                        </p>
                      </div>
                      <span className={`badge badge-${ticket.priority || 'medium'}`}>
                        {ticket.status || 'open'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {connected && (
            <div className="mt-4 text-sm text-green-600 flex items-center">
              <TrendingUp size={16} className="mr-2" />
              Live updates connected
            </div>
          )}
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}

