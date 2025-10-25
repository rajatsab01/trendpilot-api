import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import LanguageSelection from "@/pages/LanguageSelection";
import Login from "@/pages/Login";
import Welcome from "@/pages/Welcome";
import Dashboard from "@/pages/Dashboard";
import Analyzer from "@/pages/Analyzer";
import BuyTokens from "@/pages/BuyTokens";
import Charity from "@/pages/Charity";
import SavedAnalyses from "@/pages/SavedAnalyses";
import NotFound from "@/pages/not-found";

function SmartRouter() {
  const [location, setLocation] = useLocation();
  
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
            <Toaster />
            <Router />
          </LanguageProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
