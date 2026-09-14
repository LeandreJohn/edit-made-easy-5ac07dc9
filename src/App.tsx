import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AssessmentResult from "./pages/AssessmentResult.tsx";
import HeadHunting from "./pages/HeadHunting.tsx";
import DavaoHub from "./pages/DavaoHub.tsx";
import Source from "./pages/Source.tsx";
import CareerSourcing from "./pages/CareerSourcing.tsx";
import ComplianceDocsUpload from "./pages/ComplianceDocsUpload.tsx";
import AssessmentPage from "./pages/AssessmentPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Dashboard variant="attendance" />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/assessment-result" element={<AssessmentResult />} />
          <Route path="/head-hunting" element={<HeadHunting />} />
          <Route path="/head-hunting/:role" element={<HeadHunting />} />
          <Route path="/davao-hub" element={<DavaoHub />} />
          <Route path="/source/:name" element={<Source />} />
          <Route path="/career-sourcing/:hearfrom" element={<CareerSourcing />} />
          <Route path="/compliance-docs-u" element={<ComplianceDocsUpload />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/ph-assessment" element={<AssessmentPage variant="ph" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
