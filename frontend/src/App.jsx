import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import OwnerPage from '@/pages/OwnerPage'
import GuestPage from '@/pages/GuestPage'
import EventTypePreviewPage from '@/pages/EventTypePreviewPage'
import NotFoundPage from '@/pages/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/owner" element={<OwnerPage />} />
        <Route path="/guest" element={<GuestPage />} />
        <Route path="/guest/users/:userId" element={<GuestPage />} />
        <Route path="/event-types/:calendarId/:id/preview" element={<EventTypePreviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
