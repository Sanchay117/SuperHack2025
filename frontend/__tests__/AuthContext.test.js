import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { authAPI } from '../lib/api';

// Mock the API
jest.mock('../lib/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should provide auth context', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.user).toBe(null);
    expect(result.current.loading).toBe(true);
  });

  it('should handle login', async () => {
    const mockToken = 'test-token';
    const mockUser = { id: 1, email: 'test@example.com', role: 'technician' };
    
    authAPI.login.mockResolvedValue({
      data: { user: mockUser, token: mockToken },
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const result = await result.current.login('test@example.com', 'password');
      expect(result.success).toBe(true);
    });
  });

  it('should check roles correctly', () => {
    const mockUser = { id: 1, email: 'admin@example.com', role: 'admin' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.hasRole('admin')).toBe(true);
    expect(result.current.hasRole('technician')).toBe(true); // admin has all permissions
    expect(result.current.hasRole('user')).toBe(false);
  });
});

