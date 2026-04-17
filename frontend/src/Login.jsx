import { useState } from 'react';
import { api } from './api.js';

function MarineScene() {
  return (
    <svg className="login-scene" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      {/* Cielo con estrellas */}
      {[
        [80,40],[200,80],[350,30],[500,60],[650,25],[800,55],[950,35],[1100,70],[1150,20],[50,90],
        [140,120],[400,100],[700,90],[900,110],[1050,80],[300,50],[600,45],[750,30],[1000,60],[450,85],
      ].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={Math.random()<0.5?1:1.5} fill="white" opacity={0.6+Math.random()*0.4}>
          <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2+i%3}s`} repeatCount="indefinite" />
        </circle>
      ))}

      {/* Luna */}
      <circle cx="1080" cy="90" r="42" fill="#f0e6b0" opacity="0.18" />
      <circle cx="1080" cy="90" r="36" fill="#fdf6d0" opacity="0.22" />
      <circle cx="1097" cy="80" r="28" fill="#0e3460" opacity="0.55" />

      {/* Reflejo de luna en el agua */}
      <ellipse cx="1080" cy="430" rx="18" ry="60" fill="#fdf6d0" opacity="0.07">
        <animate attributeName="rx" values="18;28;18" dur="4s" repeatCount="indefinite" />
      </ellipse>

      {/* Montañas/costa lejana */}
      <path d="M0,320 L80,240 L180,290 L300,200 L420,270 L520,210 L620,260 L720,195 L820,255 L920,205 L1020,250 L1120,215 L1200,240 L1200,380 L0,380 Z"
        fill="#0a2a4a" opacity="0.55" />
      <path d="M0,350 L60,290 L160,320 L260,270 L360,310 L460,265 L560,295 L660,260 L760,290 L860,255 L960,285 L1060,260 L1160,280 L1200,265 L1200,380 L0,380 Z"
        fill="#0c3256" opacity="0.6" />

      {/* Mar — fondo */}
      <rect x="0" y="375" width="1200" height="225" fill="#0a2a4a" />

      {/* Barco ferry principal */}
      <g transform="translate(160,270)">
        {/* Casco */}
        <path d="M0,80 L20,110 L280,110 L300,80 Z" fill="#1a3a5c" />
        <path d="M20,110 L15,125 L285,125 L280,110 Z" fill="#122840" />
        {/* Línea de flotación */}
        <rect x="15" y="120" width="270" height="4" fill="#c0392b" opacity="0.8" />
        {/* Superestructura */}
        <rect x="60" y="40" width="160" height="42" rx="3" fill="#1e4d7b" />
        <rect x="80" y="18" width="100" height="26" rx="3" fill="#1e4d7b" />
        <rect x="100" y="4" width="60" height="18" rx="2" fill="#2a6098" />
        {/* Chimenea */}
        <rect x="145" y="-14" width="20" height="22" rx="3" fill="#2a2a2a" />
        <ellipse cx="155" cy="-14" rx="10" ry="4" fill="#1a1a1a" />
        {/* Humo */}
        <circle cx="155" cy="-22" r="6" fill="#aaa" opacity="0.15">
          <animate attributeName="cy" values="-22;-50;-22" dur="4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.15;0;0.15" dur="4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="160" cy="-30" r="9" fill="#aaa" opacity="0.1">
          <animate attributeName="cy" values="-30;-65;-30" dur="5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.1;0;0.1" dur="5s" repeatCount="indefinite"/>
        </circle>
        {/* Ventanas */}
        {[0,1,2,3,4].map(i => <rect key={i} x={68+i*30} y="48" width="14" height="10" rx="2" fill="#a8d8f0" opacity="0.7" />)}
        {[0,1,2].map(i => <rect key={i} x={88+i*30} y="24" width="12" height="8" rx="2" fill="#a8d8f0" opacity="0.6" />)}
        {/* Mástil */}
        <line x1="155" y1="4" x2="155" y2="-40" stroke="#999" strokeWidth="2" opacity="0.7"/>
        <line x1="135" y1="-20" x2="175" y2="-20" stroke="#999" strokeWidth="1.5" opacity="0.6"/>
        {/* Bandera */}
        <polygon points="175,-20 175,-10 190,-15" fill="#c0392b" opacity="0.8">
          <animate attributeName="points" values="175,-20 175,-10 190,-15;175,-20 175,-10 193,-13;175,-20 175,-10 190,-15" dur="2s" repeatCount="indefinite"/>
        </polygon>
        {/* Ancla decorativa */}
        <text x="245" y="100" fontSize="18" fill="#4a8ab5" opacity="0.5">⚓</text>
        {/* Animación balanceo suave */}
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0,0;0,-3;0,0;0,-2;0,0" dur="6s" repeatCount="indefinite"/>
      </g>

      {/* Barco pequeño a lo lejos */}
      <g transform="translate(820,295)" opacity="0.45">
        <path d="M0,35 L8,48 L120,48 L128,35 Z" fill="#1a3a5c" />
        <rect x="25" y="14" width="68" height="22" rx="2" fill="#1e4d7b" />
        <rect x="38" y="3" width="38" height="14" rx="2" fill="#1e4d7b" />
        <line x1="57" y1="3" x2="57" y2="-12" stroke="#999" strokeWidth="1.5" opacity="0.6"/>
        <animateTransform attributeName="transform" type="translate" additive="sum"
          values="0,0;0,-2;0,0" dur="8s" repeatCount="indefinite"/>
      </g>

      {/* Olas animadas */}
      <g opacity="0.35">
        <path d="M0,380 Q60,365 120,380 Q180,395 240,380 Q300,365 360,380 Q420,395 480,380 Q540,365 600,380 Q660,395 720,380 Q780,365 840,380 Q900,395 960,380 Q1020,365 1080,380 Q1140,395 1200,380 L1200,400 L0,400 Z" fill="#0d3b6e" opacity="0.8">
          <animate attributeName="d"
            values="M0,380 Q60,365 120,380 Q180,395 240,380 Q300,365 360,380 Q420,395 480,380 Q540,365 600,380 Q660,395 720,380 Q780,365 840,380 Q900,395 960,380 Q1020,365 1080,380 Q1140,395 1200,380 L1200,400 L0,400 Z;
                    M0,380 Q60,395 120,380 Q180,365 240,380 Q300,395 360,380 Q420,365 480,380 Q540,395 600,380 Q660,365 720,380 Q780,395 840,380 Q900,365 960,380 Q1020,395 1080,380 Q1140,365 1200,380 L1200,400 L0,400 Z;
                    M0,380 Q60,365 120,380 Q180,395 240,380 Q300,365 360,380 Q420,395 480,380 Q540,365 600,380 Q660,395 720,380 Q780,365 840,380 Q900,395 960,380 Q1020,365 1080,380 Q1140,395 1200,380 L1200,400 L0,400 Z"
            dur="5s" repeatCount="indefinite"/>
        </path>
        <path d="M0,400 Q80,385 160,400 Q240,415 320,400 Q400,385 480,400 Q560,415 640,400 Q720,385 800,400 Q880,415 960,400 Q1040,385 1120,400 Q1160,408 1200,400 L1200,420 L0,420 Z" fill="#0a2a52" opacity="0.9">
          <animate attributeName="d"
            values="M0,400 Q80,385 160,400 Q240,415 320,400 Q400,385 480,400 Q560,415 640,400 Q720,385 800,400 Q880,415 960,400 Q1040,385 1120,400 Q1160,408 1200,400 L1200,420 L0,420 Z;
                    M0,400 Q80,415 160,400 Q240,385 320,400 Q400,415 480,400 Q560,385 640,400 Q720,415 800,400 Q880,385 960,400 Q1040,415 1120,400 Q1160,392 1200,400 L1200,420 L0,420 Z;
                    M0,400 Q80,385 160,400 Q240,415 320,400 Q400,385 480,400 Q560,415 640,400 Q720,385 800,400 Q880,415 960,400 Q1040,385 1120,400 Q1160,408 1200,400 L1200,420 L0,420 Z"
            dur="7s" repeatCount="indefinite"/>
        </path>
      </g>

      {/* Faro */}
      <g transform="translate(1090,195)" opacity="0.5">
        <rect x="8" y="0" width="16" height="70" fill="#c8d8e8" />
        <polygon points="0,0 32,0 24,-18 8,-18" fill="#a0b8c8" />
        <rect x="6" y="-22" width="20" height="6" rx="2" fill="#e8e0a0" opacity="0.8">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
        </rect>
        <rect x="0" y="70" width="32" height="8" rx="1" fill="#a0b8c8" />
      </g>

      {/* Gaviotas */}
      {[[400,130],[430,118],[460,135],[600,100],[625,112]].map(([x,y],i) => (
        <path key={i} d={`M${x},${y} Q${x+8},${y-7} ${x+16},${y} Q${x+8},${y-3} ${x},${y}`}
          fill="none" stroke="white" strokeWidth="1.5" opacity="0.4">
          <animateTransform attributeName="transform" type="translate"
            values="0,0;4,-6;8,-3;12,-8;16,-4" dur={`${5+i}s`} repeatCount="indefinite"/>
        </path>
      ))}
    </svg>
  );
}

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
      <MarineScene />
      <div className="login-overlay" />
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
