import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Agenda from "@/pages/agenda";
import Pacientes from "@/pages/pacientes";
import PacienteDetail from "@/pages/paciente-detail";
import Pipeline from "@/pages/pipeline";
import Profissionais from "@/pages/profissionais";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/agenda" component={Agenda} />
        <Route path="/pacientes" component={Pacientes} />
        <Route path="/pacientes/:id" component={PacienteDetail} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/profissionais" component={Profissionais} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
