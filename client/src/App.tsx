import { Switch, Route } from "wouter";
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
import Settings from "@/pages/Settings";
import AddBroker from "@/pages/AddBroker";
import EditBroker from "@/pages/EditBroker";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LanguageSelection} />
      <Route path="/login" component={Login} />
      <Route path="/welcome" component={Welcome} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analyzer" component={Analyzer} />
      <Route path="/buy-tokens" component={BuyTokens} />
      <Route path="/settings" component={Settings} />
      <Route path="/add-broker" component={AddBroker} />
      <Route path="/edit-broker/:id" component={EditBroker} />
      <Route component={NotFound} />
    </Switch>
  );
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
