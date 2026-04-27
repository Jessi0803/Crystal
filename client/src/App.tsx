// Crystal Aura — 主應用程式
// 月光典雅 Lunar Elegance Design
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Quiz from "./pages/Quiz";
import Custom from "./pages/Custom";
import CustomForm from "./pages/CustomForm"
import CustomFormB from "./pages/CustomFormB";
import Knowledge from "./pages/Knowledge";
import ShoppingGuide from "./pages/ShoppingGuide";
import Contact from "./pages/Contact";
import About from "./pages/About";
import CrystalWorkshop from "./pages/CrystalWorkshop";
import Checkout from "./pages/Checkout";
import OrderResult from "./pages/OrderResult";
import BalancePayment from "./pages/BalancePayment";
import AdminOrders from "./pages/AdminOrders";
import AdminRevenue from "./pages/AdminRevenue";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import MemberCenter from "./pages/MemberCenter";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CartDrawer from "./components/CartDrawer";
import ChatBot from "./components/ChatBot";
import { useLocation } from "wouter";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/quiz" component={Quiz} />
      <Route path="/custom" component={Custom} />
      <Route path="/custom/form" component={CustomForm} />
      <Route path="/custom/form-b" component={CustomFormB} />
      <Route path="/knowledge" component={Knowledge} />
      <Route path="/shopping-guide" component={ShoppingGuide} />
      <Route path="/crystal-workshop" component={CrystalWorkshop} />
      <Route path="/contact" component={Contact} />
      <Route path="/about" component={About} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order/:merchantTradeNo" component={OrderResult} />
      <Route path="/balance/:merchantTradeNo" component={BalancePayment} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/revenue" component={AdminRevenue} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/member" component={MemberCenter} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isAdminPage = location.startsWith("/admin");

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CartProvider>
          <TooltipProvider>
            <Toaster position="top-right" />
            {isAdminPage ? (
              <Router />
            ) : (
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">
                  <Router />
                </main>
                <Footer />
              </div>
            )}
            {!isAdminPage && <CartDrawer />}
            {!isAdminPage && <ChatBot />}
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
