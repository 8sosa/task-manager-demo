import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_URL = 'https://task-api-demo-5380.onrender.com';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState('login'); 

  useEffect(() => {
    if (token) setView('dashboard');
  }, [token]);

  const handleLogin = (t) => {
    localStorage.setItem('token', t);
    setToken(t);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setView('login');
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#f0f2f5' }}>
      {view === 'login' ? (
        <AuthScreen onLogin={handleLogin} />
      ) : (
        <Dashboard token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}

// --- SUB-COMPONENT: Auth ---
function AuthScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegister ? '/register' : '/login';
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, form);
      if (isRegister) {
        setMsg('Account created! Please log in.');
        setIsRegister(false);
      } else {
        onLogin(res.data.token);
      }
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error occurred');
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1">
      <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-header bg-primary text-white text-center py-4">
          <h3 className="mb-0 fw-bold">{isRegister ? 'Join Us' : 'Welcome Back'}</h3>
          <small className="text-white-50">Task Management Simplified</small>
        </div>
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label text-muted small fw-bold">USERNAME</label>
              <input className="form-control form-control-lg bg-light border-0" 
                placeholder="Enter username" 
                onChange={e => setForm({...form, username: e.target.value})} />
            </div>
            <div className="mb-4">
              <label className="form-label text-muted small fw-bold">PASSWORD</label>
              <input className="form-control form-control-lg bg-light border-0" type="password" 
                placeholder="Enter password" 
                onChange={e => setForm({...form, password: e.target.value})} />
            </div>
            <button className="btn btn-primary w-100 btn-lg rounded-pill shadow-sm fw-bold">
              {isRegister ? 'Sign Up' : 'Log In'}
            </button>
          </form>
          
          {msg && <div className="alert alert-warning mt-3 text-center small py-2">{msg}</div>}
          
          <div className="text-center mt-4">
            <small className="text-muted">{isRegister ? 'Already have an account?' : 'New here?'}</small>
            <button className="btn btn-link text-decoration-none fw-bold" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Login' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: Dashboard ---
function Dashboard({ token, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [newTask, setNewTask] = useState({ title: '', priority: 'Medium', status: 'Pending', dueDate: '' });
  const [editId, setEditId] = useState(null);

  const fetchTasks = useCallback(async () => {
    const query = new URLSearchParams(filter).toString();
    try {
      const res = await axios.get(`${API_URL}/tasks?${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  }, [filter, token]); // Re-create only if filter or token changes

  useEffect(() => { 
    fetchTasks(); 
  }, [fetchTasks]); 

  const saveTask = async (e) => {
    e.preventDefault();
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    
    if (editId) {
      await axios.put(`${API_URL}/tasks/${editId}`, newTask, authHeader);
      setEditId(null);
    } else {
      await axios.post(`${API_URL}/tasks`, newTask, authHeader);
    }
    setNewTask({ title: '', priority: 'Medium', status: 'Pending', dueDate: '' });
    fetchTasks();
  };

  const deleteTask = async (id) => {
    if (window.confirm('Delete this task?')) {
      await axios.delete(`${API_URL}/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTasks();
    }
  };

  const startEdit = (task) => {
    setNewTask(task);
    setEditId(task.id);
  };

  const getPriorityColor = (p) => {
    if (p === 'High') return 'danger';
    if (p === 'Medium') return 'warning';
    return 'success';
  };

  return (
    <div className="container py-5" style={{ maxWidth: '900px' }}>
      <div className="d-flex justify-content-between align-items-center mb-5">
        <div>
          <h2 className="fw-bold text-dark mb-0">My Tasks</h2>
          <small className="text-muted">Stay organized and productive</small>
        </div>
        <button onClick={onLogout} className="btn btn-outline-danger btn-sm rounded-pill px-3">
          Sign Out
        </button>
      </div>

      {/* CONTROLS & FILTERS */}
      <div className="row g-3 mb-4">
        <div className="col-md-8">
          <div className="card border-0 shadow-sm p-3">
            <h6 className="text-muted text-uppercase small fw-bold mb-3">{editId ? 'Editing Task' : 'Create New Task'}</h6>
            <form onSubmit={saveTask} className="row g-2 align-items-center">
              <div className="col-12 col-md-5">
                <input className="form-control border-0 bg-light" placeholder="What needs to be done?" 
                  value={newTask.title} required
                  onChange={e => setNewTask({...newTask, title: e.target.value})} />
              </div>
              <div className="col-6 col-md-3">
                <input type="date" className="form-control border-0 bg-light" value={newTask.dueDate}
                  onChange={e => setNewTask({...newTask, dueDate: e.target.value})} />
              </div>
              <div className="col-6 col-md-2">
                <select className="form-select border-0 bg-light" value={newTask.priority}
                  onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </div>
              <div className="col-12 col-md-2">
                <button className={`btn w-100 ${editId ? 'btn-warning' : 'btn-primary'}`}>
                  {editId ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm p-3 h-100 d-flex flex-column justify-content-center">
            <div className="row g-2">
              <div className="col-6">
                 <select className="form-select form-select-sm" onChange={e => setFilter({...filter, status: e.target.value})}>
                  <option value="">Status: All</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="col-6">
                <select className="form-select form-select-sm" onChange={e => setFilter({...filter, priority: e.target.value})}>
                  <option value="">Priority: All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TASK LIST */}
      <div className="row g-3">
        {tasks.length === 0 && <div className="text-center text-muted py-5">No tasks found. Time to relax! ☕</div>}
        
        {tasks.map(t => (
          <div key={t.id} className="col-12">
            <div className={`card border-0 shadow-sm p-3 border-start border-4 border-${getPriorityColor(t.priority)}`}>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" 
                       checked={t.status === 'Completed'} readOnly />
                  </div>
                  <div>
                    <h5 className={`mb-1 fw-bold ${t.status === 'Completed' ? 'text-decoration-line-through text-muted' : ''}`}>
                      {t.title}
                    </h5>
                    <div className="d-flex gap-2 align-items-center">
                      <span className={`badge bg-${getPriorityColor(t.priority)} bg-opacity-10 text-${getPriorityColor(t.priority)}`}>
                        {t.priority}
                      </span>
                      <small className="text-muted">
                        Due: {t.dueDate || 'Unscheduled'}
                      </small>
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2">
                   <span className={`badge rounded-pill text-dark border ${t.status === 'In Progress' ? 'bg-info bg-opacity-25 border-info' : 'bg-light border-light'}`}>
                      {t.status}
                   </span>
                   <div className="vr mx-2"></div>
                   <button onClick={() => startEdit(t)} className="btn btn-sm btn-link text-decoration-none text-muted p-0">
                     Edit
                   </button>
                   <button onClick={() => deleteTask(t.id)} className="btn btn-sm btn-link text-decoration-none text-danger p-0 ms-2">
                     ✕
                   </button>
                </div>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;