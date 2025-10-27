import { useState } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { User, Lock, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [password, setPassword] = useState({
    current: '',
    newPassword: '',
    confirm: '',
  });
  const [webhook, setWebhook] = useState({
    url: '',
    enabled: false,
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password.newPassword !== password.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    toast.success('Password changed successfully!');
    setPassword({ current: '', newPassword: '', confirm: '' });
  };

  const handleWebhookSave = async (e) => {
    e.preventDefault();
    toast.success('Webhook configuration saved!');
  };

  return (
    <ProtectedRoute>
      <AuthLayout>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

          <div className="space-y-6">
            {/* Profile Settings */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <User className="text-primary-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
              </div>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary">
                    Update Profile
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <Lock className="text-primary-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={password.current}
                    onChange={(e) => setPassword({ ...password, current: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password.newPassword}
                    onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <button type="submit" className="btn btn-primary">
                    Change Password
                  </button>
                </div>
              </form>
            </div>

            {/* Webhook Integration */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-4">
                <Globe className="text-primary-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Webhook Integration</h2>
              </div>
              <form onSubmit={handleWebhookSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={webhook.url}
                    onChange={(e) => setWebhook({ ...webhook, url: e.target.value })}
                    placeholder="https://example.com/webhook"
                    className="input w-full"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="webhook-enabled"
                    checked={webhook.enabled}
                    onChange={(e) => setWebhook({ ...webhook, enabled: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="webhook-enabled" className="ml-2 block text-sm text-gray-700">
                    Enable webhook notifications
                  </label>
                </div>
                <div>
                  <button type="submit" className="btn btn-primary">
                    Save Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}

