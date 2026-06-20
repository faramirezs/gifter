import { Routes, Route, Navigate } from "react-router-dom";
import ProviderDashboard from "./provider/ProviderDashboard";
import AdminDashboard from "./admin/AdminDashboard";
import OrderPage from "./order/OrderPage";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Routes>
        <Route path="/" element={<Navigate to="/provider" replace />} />
        <Route path="/provider" element={<ProviderDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/o/:token" element={<OrderPage />} />
      </Routes>
    </div>
  );
}
