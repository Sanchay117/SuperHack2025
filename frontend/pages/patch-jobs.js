import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthLayout } from '../components/AuthLayout';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { patchJobsAPI } from '../lib/api';
import { Plus, HardDrive } from 'lucide-react';

export default function PatchJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newJob, setNewJob] = useState({
    target: '',
    plan: '{}',
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/patch_jobs', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching patch jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (e) => {
    e.preventDefault();
    
    try {
      const plan = JSON.parse(newJob.plan);
      await patchJobsAPI.create({
        target: newJob.target,
        plan,
      });
      toast.success('Patch job created!');
      setShowModal(false);
      setNewJob({ target: '', plan: '{}' });
      fetchJobs();
    } catch (error) {
      toast.error('Failed to create patch job: ' + error.message);
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
    },
    {
      key: 'target',
      label: 'Target',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`badge ${value === 'pending' ? 'badge-high' : value === 'running' ? 'badge-medium' : 'badge-success'}`}>
          {value || 'pending'}
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
            <h1 className="text-3xl font-bold text-gray-900">Patch Jobs</h1>
            <button
              onClick={() => setShowModal(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Create Job</span>
            </button>
          </div>

          <div className="card">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No patch jobs yet. Create one to get started!
              </div>
            ) : (
              <DataTable data={jobs} columns={columns} searchable={true} />
            )}
          </div>

          {/* Create Job Modal */}
          <Modal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            title="Create Patch Job"
            size="lg"
          >
            <form onSubmit={createJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target
                </label>
                <input
                  type="text"
                  value={newJob.target}
                  onChange={(e) => setNewJob({ ...newJob, target: e.target.value })}
                  required
                  className="input w-full"
                  placeholder="server-01.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan (JSON)
                </label>
                <textarea
                  value={newJob.plan}
                  onChange={(e) => setNewJob({ ...newJob, plan: e.target.value })}
                  required
                  rows={10}
                  className="input w-full font-mono text-sm"
                  placeholder='{"packages": ["nginx", "openssl"], "method": "yum update"}'
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter valid JSON for the patch plan
                </p>
              </div>

              <div className="flex space-x-3">
                <button type="submit" className="btn btn-primary flex-1">
                  Create Job
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

