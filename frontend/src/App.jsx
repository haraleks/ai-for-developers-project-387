import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import OwnerPage from '@/pages/OwnerPage'
import GuestPage from '@/pages/GuestPage'
import EventTypePreviewPage from '@/pages/EventTypePreviewPage'
import NotFoundPage from '@/pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/owner" element={<OwnerPage />} />
        <Route path="/guest" element={<GuestPage />} />
        <Route path="/event-types/:id/preview" element={<EventTypePreviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
