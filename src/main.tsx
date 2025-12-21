import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import KeyManagerApp from './KeyManagerApp'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)

const isKeysPage = window.location.hash === '#keys'
const RootComponent = isKeysPage ? KeyManagerApp : App

root.render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
)
