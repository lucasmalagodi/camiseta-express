import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { CartProvider } from "./contexts/CartContext";
import Layout from "./components/Layout";
import AdminLayout from "./components/admin/AdminLayout";
import ProtectedRoute from "./components/admin/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminPointsImports from "./pages/admin/AdminPointsImports";
import AdminImportDetails from "./pages/admin/AdminImportDetails";
import AdminAgenciesDashboard from "./pages/admin/AdminAgenciesDashboard";
import AdminAgencyHistory from "./pages/admin/AdminAgencyHistory";
import AdminSmtpConfig from "./pages/admin/AdminSmtpConfig";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails";
import AdminHeroProducts from "./pages/admin/AdminHeroProducts";
import AdminTickets from "./pages/admin/AdminTickets";
import AdminTicketDetail from "./pages/admin/AdminTicketDetail";
import AdminReports from "./pages/admin/AdminReports";
import AdminReportBuilder from "./pages/admin/AdminReportBuilder";
import AdminReportView from "./pages/admin/AdminReportView";
import AdminLegalDocuments from "./pages/admin/AdminLegalDocuments";
import CheckoutConfirmation from "./pages/CheckoutConfirmation";
import CheckoutInstructions from "./pages/CheckoutInstructions";
import Cart from "./pages/Cart";
import Product from "./pages/Product";
import Collection from "./pages/Collection";
import Contact from "./pages/Contact";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import MyOrders from "./pages/MyOrders";
import MyAccount from "./pages/MyAccount";
import OrderDetail from "./pages/OrderDetail";
import CustomerPanel from "./pages/CustomerPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AdminAuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
                {/* Rotas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="cart" element={<Cart />} />
                <Route path="collection" element={<Collection />} />
                <Route path="product/:id" element={<Product />} />
                <Route path="checkout/confirmation/:orderId" element={<CheckoutConfirmation />} />
                <Route path="checkout/instructions" element={<CheckoutInstructions />} />
                <Route path="minha-conta" element={<MyAccount />} />
                {/* Redirecionamentos para manter compatibilidade */}
                <Route path="contato" element={<MyAccount />} />
                <Route path="tickets" element={<MyAccount />} />
                <Route path="tickets/:id" element={<TicketDetail />} />
                <Route path="pedidos" element={<MyAccount />} />
                <Route path="pedidos/:id" element={<OrderDetail />} />
                <Route path="painel" element={<CustomerPanel />} />
                </Route>

                {/* Rotas do painel admin */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="produtos" element={<AdminProducts />} />
                  <Route path="imports" element={<AdminPointsImports />} />
                  <Route path="imports/:id" element={<AdminImportDetails />} />
                  <Route path="agencies" element={<AdminAgenciesDashboard />} />
                  <Route path="agencies/:id/history" element={<AdminAgencyHistory />} />
                  <Route path="pedidos" element={<AdminOrders />} />
                  <Route path="pedidos/:id" element={<AdminOrderDetails />} />
                  <Route path="destaques" element={<AdminHeroProducts />} />
                  <Route path="configuracoes" element={<AdminSmtpConfig />} />
                  <Route path="tickets" element={<AdminTickets />} />
                  <Route path="tickets/:id" element={<AdminTicketDetail />} />
                  <Route path="documentos-legais" element={<AdminLegalDocuments />} />
                  <Route path="relatorios" element={<AdminReports />} />
                  <Route path="relatorios/novo" element={<AdminReportBuilder />} />
                  <Route path="relatorios/:id" element={<AdminReportView />} />
                  <Route path="relatorios/:id/editar" element={<AdminReportBuilder />} />
                </Route>

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
      </AdminAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
