import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import { Layout } from './components/Layout'
import { Overview } from './pages/Overview'
import { Channels } from './pages/Channels'
import { ChannelDetail } from './pages/ChannelDetail'
import { Videos } from './pages/Videos'
import { VideoDetail } from './pages/VideoDetail'
import { Alerts } from './pages/Alerts'
import { Connections } from './pages/Connections'
import { Logs } from './pages/Logs'
import { SettingsPage } from './pages/Settings'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="kenh" element={<Channels />} />
            <Route path="kenh/:id" element={<ChannelDetail />} />
            <Route path="video" element={<Videos />} />
            <Route path="video/:id" element={<VideoDetail />} />
            <Route path="canh-bao" element={<Alerts />} />
            <Route path="ket-noi" element={<Connections />} />
            <Route path="nhat-ky" element={<Logs />} />
            <Route path="cai-dat" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  </StrictMode>,
)
