import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import VersionChecker from "@/components/VersionChecker";
import LanguageSelection from "@/pages/LanguageSelection";
import Login from "@/pages/Login";
import Welcome from "@/pages/Welcome";
import Dashboard from "@/pages/Dashboard";
import Analyzer from "@/pages/Analyzer";
import BuyTokens from "@/pages/BuyTokens";
import Charity from "@/pages/Charity";
import SavedAnalyses from "@/pages/SavedAnalyses";
import Community from "@/pages/Community";
import TraderProfile from "@/pages/TraderProfile";
import Messages from "@/pages/Messages";
import Admin from "@/pages/Admin";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import ContactUs from "@/pages/ContactUs";
import NotFound from "@/pages/not-found";

function SmartRouter() {
  const [location, setLocation] = useLocation();
  
  useEffect(() => {
    // Scroll to top on every route change
    window.scrollTo(0, 0);
  }, [location]);
  
  useEffect(() => {
    // Only run smart routing on initial load (when at root)
    if (location === "/") {
      const languageCompleted = localStorage.getItem("languageCompleted");
      const loginCompleted = localStorage.getItem("loginCompleted");
      
      // If both onboarding steps completed, skip to welcome screen
      if (languageCompleted && loginCompleted) {
        setLocation("/welcome");
      }
    }
  }, [location, setLocation]);
  
  return (
    <Switch>
      <Route path="/" component={LanguageSelection} />
      <Route path="/login" component={Login} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analyzer" component={Analyzer} />
      <Route path="/buy-tokens" component={BuyTokens} />
      <Route path="/charity" component={Charity} />
      <Route path="/saved" component={SavedAnalyses} />
      <Route path="/community" component={Community} />
      <Route path="/trader/:traderId" component={TraderProfile} />
      <Route path="/messages" component={Messages} />
      <Route path="/messages/:chatUserId" component={Messages} />
      <Route path="/admin" component={Admin} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/contact" component={ContactUs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router() {
  return <SmartRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <LanguageProvider>
            <VersionChecker />
            <Toaster />
            <Router />
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
