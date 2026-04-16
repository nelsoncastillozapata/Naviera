import { useState } from 'react';
import { api } from './api.js';

function Login({ onLogin }) {
  const [modo, setModo] = useState('login');
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = modo === 'login' ? '/auth/login' : '/auth/register';
      const payload = modo === 'login'
        ? { email: form.email, password: form.password }
        : { nombre: form.nombre, email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">⚓</div>
        <h1>SaaS Naviera</h1>
        <p className="login-sub">Gestión de reservas de transporte marítimo</p>

        <div className="login-tabs">
          <button className={modo === 'login' ? 'active' : ''} onClick={() => setModo('login')}>Iniciar sesión</button>
          <button className={modo === 'register' ? 'active' : ''} onClick={() => setModo('register')}>Registrarse</button>
        </div>

        <form onSubmit={submit}>
          {modo === 'register' && (
            <div className="login-field">
              <label>Nombre</label>
              <input name="nombre" value={form.nombre} onChange={handle} placeholder="Tu nombre" required />
            </div>
          )}
          <div className="login-field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handle} placeholder="correo@ejemplo.com" required />
          </div>
          <div className="login-field">
            <label>Contraseña</label>
            <input name="password" type="password" value={form.password} onChange={handle} placeholder="••••••••" required />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
