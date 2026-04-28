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
import CustomFormB from "./pages/CustomFormB"
import CustomFormC from "./pages/CustomFormC"
import CustomFormD from "./pages/CustomFormD";
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
import { useEffect, useState } from "react";

const LINE_OFFICIAL_URL = "https://line.me/R/ti/p/@011tymeh";

function LineWelcomeModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("line_welcome") === "1") {
      setShow(true);
      // 清掉 query param，不影響後續導航
      const clean = window.location.pathname;
      window.history.replaceState(null, "", clean);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={() => setShow(false)}
    >
      <div
        className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: "#06C755" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.630 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.630 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-[oklch(0.1_0_0)] mb-2"
          style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
          LINE 登入成功！
        </h2>
        <p className="text-sm text-[oklch(0.5_0_0)] font-body leading-relaxed mb-6">
          加入官方 LINE 帳號，<br />
          即時接收訂單通知與專屬優惠 🌸
        </p>
        <a
          href={LINE_OFFICIAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setShow(false)}
          className="block w-full py-3 rounded-xl text-white text-sm font-body tracking-wide mb-3 transition-opacity hover:opacity-90"
          style={{ background: "#06C755" }}
        >
          加入官方 LINE
        </a>
        <button
          onClick={() => setShow(false)}
          className="block w-full py-3 rounded-xl text-sm font-body text-[oklch(0.55_0_0)] hover:text-[oklch(0.3_0_0)] transition-colors"
        >
          稍後再說
        </button>
      </div>
    </div>
  );
}
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
      <Route path="/custom/form-c" component={CustomFormC} />
      <Route path="/custom/form-d" component={CustomFormD} />
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
            <LineWelcomeModal />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
