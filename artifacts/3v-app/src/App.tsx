import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { toast } from "sonner";
import { SettingsProvider } from "@/hooks/useSettings";
import { AuthProvider } from "@/hooks/useAuth";
import { CallSessionProvider } from "@/contexts/CallSessionContext";
import { FloatingCallBanner } from "@/components/FloatingCallBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import ScrollToTop from "@/components/ScrollToTop";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import Index from "./pages/Index";
import About from "./pages/About";
import Activities from "./pages/Activities";
import BiblicalReading from "./pages/BiblicalReading";
import BibleBookDetail from "./pages/BibleBookDetail";
import Contact from "./pages/Contact";
import Gallery from "./pages/Gallery";
import FAQ from "./pages/FAQ";
import Install from "./pages/Install";
import Auth from "./pages/Auth";
import AIChat from "./pages/AIChat";
import PrayerForum from "./pages/PrayerForum";
import Careme2026 from "./pages/Careme2026";
import Careme from "./pages/Careme";
import CheminDeCroix from "./pages/CheminDeCroix";
import ShareDebug from "./pages/ShareDebug";
import ActivityReports from "./pages/ActivityReports";
import CallsAndLives from "./pages/CallsAndLives";
import Neuvaines from "./pages/Neuvaines";
import NeuvaineDayView from "./pages/NeuvaineDayView";
import Admin from "./pages/Admin";
import AdminReadings from "./pages/admin/AdminReadings";
import AdminPrayers from "./pages/admin/AdminPrayers";
import AdminContact from "./pages/admin/AdminContact";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminHome from "./pages/admin/AdminHome";
import AdminAbout from "./pages/admin/AdminAbout";
import AdminAuthor from "./pages/admin/AdminAuthor";
import AdminDesign from "./pages/admin/AdminDesign";
import AdminActivities from "./pages/admin/AdminActivities";
import AdminGallery from "./pages/admin/AdminGallery";
import AdminFAQ from "./pages/admin/AdminFAQ";
import AdminAI from "./pages/admin/AdminAI";
import AdminCareme2026 from "./pages/admin/AdminCareme2026";
import AdminCheminDeCroix from "./pages/admin/AdminCheminDeCroix";
import AdminNeuvaines from "./pages/admin/AdminNeuvaines";
import AdminDebugCareme from "./pages/admin/AdminDebugCareme";
import AdminTestSave from "./pages/admin/AdminTestSave";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminNotificationScheduler from "./pages/admin/AdminNotificationScheduler";
import AdminVideo from "./pages/admin/AdminVideo";
import AdminVideoRoom from "./pages/admin/AdminVideoRoom";
import AdminRepair from "./pages/AdminRepair";
import Profile from "./pages/Profile";
import Creator from "./pages/Creator";
import Settings from "./pages/Settings";
import Documents3V from "./pages/Documents3V";
import NotFound from "./pages/NotFound";
import AdminDiagnostics from "@/components/AdminDiagnostics";
import NotificationInitializer from "@/components/NotificationInitializer";
import FloatingSupportButton from "@/components/FloatingSupportButton";

const queryClient = new QueryClient();

const AppNotificationInitializer = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <NotificationInitializer />
      {children}
    </>
  );
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection:', event.reason);
      toast.error('Une erreur inattendue est survenue.');
      event.preventDefault();
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <SettingsProvider>
              {isLoading && <LoadingScreen />}
              <Toaster />
              <Sonner />
              <PWAUpdatePrompt />
              <ErrorBoundary>
                <BrowserRouter>
                  <CallSessionProvider>
                  <AppNotificationInitializer>
                    <ScrollToTop />
                    <FloatingCallBanner />
                    <FloatingSupportButton />
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/activities" element={<Activities />} />
                      <Route path="/biblical-reading" element={<BiblicalReading />} />
                      <Route path="/bible-book/:bookId" element={<BibleBookDetail />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/contacts" element={<Contact />} />
                      <Route path="/gallery" element={<Gallery />} />
                      <Route path="/install" element={<Install />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/ai-chat" element={<AIChat />} />
                      <Route path="/prayer-forum" element={<PrayerForum />} />
                      <Route path="/careme" element={<Careme />} />
                      <Route path="/careme-2026" element={<Careme2026 />} />
                      <Route path="/chemin-de-croix" element={<CheminDeCroix />} />
                      <Route path="/share-debug" element={<ShareDebug />} />
                      <Route path="/reports" element={<ActivityReports />} />
                      <Route path="/calls-lives" element={<CallsAndLives />} />
                      <Route path="/neuvaines" element={<Neuvaines />} />
                      <Route path="/neuvaines/:id" element={<NeuvaineDayView />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/createur" element={<Creator />} />
                      <Route path="/admin-repair" element={<AdminRepair />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/admin/home" element={<AdminHome />} />
                      <Route path="/admin/about" element={<AdminAbout />} />
                      <Route path="/admin/author" element={<AdminAuthor />} />
                      <Route path="/admin/design" element={<AdminDesign />} />
                      <Route path="/admin/careme2026" element={<AdminCareme2026 />} />
                      <Route path="/admin/debug-careme" element={<AdminDebugCareme />} />
                      <Route path="/admin/test-save" element={<AdminTestSave />} />
                      <Route path="/admin/chemin-de-croix" element={<AdminCheminDeCroix />} />
                      <Route path="/admin/neuvaines" element={<AdminNeuvaines />} />
                      <Route path="/admin/activities" element={<AdminActivities />} />
                      <Route path="/admin/readings" element={<AdminReadings />} />
                      <Route path="/admin/prayers" element={<AdminPrayers />} />
                      <Route path="/admin/gallery" element={<AdminGallery />} />
                      <Route path="/admin/faq" element={<AdminFAQ />} />
                      <Route path="/admin/contact" element={<AdminContact />} />
                      <Route path="/admin/ai" element={<AdminAI />} />
                      <Route path="/admin/notifications" element={<AdminNotifications />} />
                      <Route path="/admin/notification-scheduler" element={<AdminNotificationScheduler />} />
                      <Route path="/admin/video" element={<AdminVideo />} />
                      <Route path="/admin/video/:roomId" element={<AdminVideoRoom />} />
                      <Route path="/meeting/:roomId" element={<AdminVideoRoom />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/admins" element={<AdminManagement />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/documents-3v" element={<Documents3V />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <AdminDiagnostics />
                  </AppNotificationInitializer>
                  </CallSessionProvider>
                </BrowserRouter>
              </ErrorBoundary>
            </SettingsProvider>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
