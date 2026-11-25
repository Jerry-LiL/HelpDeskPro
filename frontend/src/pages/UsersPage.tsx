import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ApiError, client } from '../api';
import { useAuth } from '../auth';
import type { Role, User } from '../types';

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client
      .users()
      .then(setUsers)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load people'));
  }, []);

  async function changeRole(user: User, role: Role) {
    if (role === user.role) return;
    try {
      const updated = await client.updateRole(user.id, role);
      setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change that role');
    }
  }

  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <h1>People</h1>
          <p className="muted">Registration creates customers. Promote them here when they join the queue.</p>
        </div>
      </header>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <select value={user.role} onChange={(event) => void changeRole(user, event.target.value as Role)}>
                    <option value="customer">customer</option>
                    <option value="agent">agent</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
