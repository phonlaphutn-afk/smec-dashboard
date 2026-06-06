@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'IBM Plex Sans Thai', sans-serif;
  background: #0a1929;
  color: #d9e2ec;
  min-height: 100vh;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #102a43; }
::-webkit-scrollbar-thumb { background: #486581; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #627d98; }

.card {
  background: #102a43;
  border: 1px solid #1e3a5f;
  border-radius: 12px;
}

.card-dark {
  background: #0d2137;
  border: 1px solid #1a3355;
  border-radius: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.badge-green  { background: rgba(56,161,105,0.15); color: #68d391; border: 1px solid rgba(56,161,105,0.3); }
.badge-yellow { background: rgba(214,158,46,0.15); color: #f6e05e; border: 1px solid rgba(214,158,46,0.3); }
.badge-blue   { background: rgba(49,130,206,0.15); color: #63b3ed; border: 1px solid rgba(49,130,206,0.3); }
.badge-orange { background: rgba(237,137,54,0.15); color: #fbd38d; border: 1px solid rgba(237,137,54,0.3); }
.badge-red    { background: rgba(229,62,62,0.15);  color: #fc8181; border: 1px solid rgba(229,62,62,0.3); }
.badge-gray   { background: rgba(113,128,150,0.15); color: #a0aec0; border: 1px solid rgba(113,128,150,0.3); }

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 8px;
  color: #829ab1;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.nav-item:hover { background: #1a3a5c; color: #d9e2ec; }
.nav-item.active { background: rgba(66,153,225,0.12); color: #63b3ed; border-color: rgba(66,153,225,0.25); }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  background: #0d2137;
  color: #829ab1;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid #1e3a5f;
  white-space: nowrap;
}
.data-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #1a3355;
  font-size: 0.82rem;
  vertical-align: middle;
}
.data-table tr:hover td { background: rgba(255,255,255,0.02); }
.data-table tr:last-child td { border-bottom: none; }

.metric-card {
  background: linear-gradient(135deg, #102a43 0%, #0d2137 100%);
  border: 1px solid #1e3a5f;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}
.metric-card::before {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 80px; height: 80px;
  background: radial-gradient(circle, rgba(66,153,225,0.08) 0%, transparent 70%);
  border-radius: 50%;
}

input, select, textarea {
  background: #0d2137;
  border: 1px solid #1e3a5f;
  border-radius: 8px;
  color: #d9e2ec;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}
input:focus, select:focus, textarea:focus {
  border-color: #4299e1;
  box-shadow: 0 0 0 2px rgba(66,153,225,0.15);
}
input::placeholder { color: #4a6584; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}
.btn-primary { background: #2b6cb0; color: #fff; }
.btn-primary:hover { background: #2c5282; }
.btn-ghost { background: transparent; color: #829ab1; border: 1px solid #2d4a6a; }
.btn-ghost:hover { background: #1a3a5c; color: #d9e2ec; }

.loading-bar {
  height: 3px;
  background: linear-gradient(90deg, #4299e1, #63b3ed, #4299e1);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 2px;
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.gantt-bar {
  height: 24px;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}
.gantt-bar::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
}
