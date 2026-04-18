import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { VoicesProvider } from "@/contexts/VoicesContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import Layout from "./components/Layout";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agents = lazy(() => import("./pages/Agents"));
const SocialAlchemist = lazy(() => import("./pages/SocialAlchemist"));
const SOPGenerator = lazy(() => import("./pages/SOPGenerator"));
const ProposalGenerator = lazy(() => import("./pages/ProposalGenerator"));
const PersonaGPT = lazy(() => import("./pages/PersonaGPT"));
const MeetingAgent = lazy(() => import("./pages/MeetingAgent"));
const PostCal = lazy(() => import("./pages/PostCal"));
const Auth = lazy(() => import("./pages/Auth"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <VoicesProvider>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" /></div>}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/agents" element={
                <ProtectedRoute>
                  <Layout>
                    <Agents />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/social-alchemist" element={
                <ProtectedRoute>
                  <Layout>
                    <SocialAlchemist />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/sop-generator" element={
                <ProtectedRoute>
                  <SOPGenerator />
                </ProtectedRoute>
              } />
              <Route path="/proposal-generator" element={
                <ProtectedRoute>
                  <ProposalGenerator />
                </ProtectedRoute>
              } />
              <Route path="/persona-gpt" element={
                <ProtectedRoute>
                  <PersonaGPT />
                </ProtectedRoute>
              } />
              <Route path="/meeting-agent" element={
                <ProtectedRoute>
                  <MeetingAgent />
                </ProtectedRoute>
              } />
              <Route path="/post-cal" element={
                <ProtectedRoute>
                  <PostCal />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </VoicesProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;