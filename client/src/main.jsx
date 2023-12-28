import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { UserProvider } from './context/UserContext.jsx'
import { HelmetProvider } from 'react-helmet-async'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
  <UserProvider>
  <HelmetProvider>
    <App />
  </HelmetProvider>
  </UserProvider>
  </React.StrictMode>,
)
