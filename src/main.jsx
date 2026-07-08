import React from 'react';
import { createRoot } from 'react-dom/client';
import './storage'; // sets up window.storage + seeds data BEFORE the app mounts
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
