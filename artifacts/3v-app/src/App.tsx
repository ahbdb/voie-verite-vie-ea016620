import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useMatch, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { toast } from "sonner";
import { SettingsProvider } from "@/hooks/useSettings";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CallSessionProvider } from "@/contexts/CallSessionContext";
import { useCallSession } from "@/contexts/CallSessionContext";
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
import ActivityReports from "./pages/ActivityReports";
import CallsAndLives from "./pages/CallsAndLives";
import Neuvaines from "./pages/Neuvaines";
import NeuvaineDayView from "./pages/NeuvaineDayView";
import MesseOffice from "./pages/MesseOffice";
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
import AdminTemoignages from "./pages/admin/AdminTemoignages";
import AdminDons from "./pages/admin/AdminDons";
import AdminFeastDays from "./pages/admin/AdminFeastDays";
import AdminChapelet from "./pages/admin/AdminChapelet";
import AdminPriereQuotidienne from "./pages/admin/AdminPriereQuotidienne";
import AdminNews from "./pages/admin/AdminNews";
import AdminRepair from "./pages/AdminRepair";
import Profile from "./pages/Profile";
import Creator from "./pages/Creator";
import Settings from "./pages/Settings";
import Documents3V from "./pages/Documents3V";
import Temoignages from "./pages/Temoignages";
import Chapelet from "./pages/Chapelet";
import PriereQuotidienne from "./pages/PriereQuotidienne";
import Dons from "./pages/Dons";
import Actualites from "./pages/Actualites";
import NotFound from "./pages/NotFound";
import ProfileCompletion from "./pages/ProfileCompletion";
import NotificationInitializer from "@/components/NotificationInitializer";
import FloatingSupportButton from "@/components/FloatingSupportButton";

const queryClient = new QueryClient();

// ── Guard: redirect to profile completion when gender not set ─────────────────
// Placed inside BrowserRouter + AuthProvider so both useLocation and useAuth work.
const EXEMPT_PATHS = ['/auth', '/profile-completion', '/install'];

const ProfileCompletionGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profileEnriched } = useAuth();
  const location = useLocation();

  // Attendre que auth soit résolu ET que l'enrichissement depuis la DB soit terminé.
  // Sans cette condition, le garde se déclencherait avant de connaître la vraie valeur
  // de profileComplete (qui vient de la table profiles, pas du user_metadata).
  if (loading || !profileEnriched) return <>{children}</>;

  // Pages exemptées : page d'auth, la page de complétion elle-même, guide d'install
  if (EXEMPT_PATHS.some((p) => location.pathname.startsWith(p))) return <>{children}</>;

  // Seulement si le genre est CONFIRMÉ absent par la DB → redirection unique
  if (user && !user.profileComplete) {
    return <Navigate to="/profile-completion" replace />;
  }

  return <>{children}</>;
};

// ── Always-on call engine ─────────────────────────────────────────────────────
// Keeps AdminVideoRoom mounted for the entire duration of a call, even when the
// user navigates to other pages. The component is hidden via CSS (not unmounted),
// so WebRTC peer connections never drop during in-app navigation.
const AlwaysOnCallPage = () => {
  const { activeCall } = useCallSession();
  const roomMatchAdmin = useMatch('/admin/video/:roomId');
  const roomMatchMeeting = useMatch('/meeting/:roomId');
  const routeMatch = roomMatchAdmin || roomMatchMeeting;

  // Determine which roomId to use: active call or current route (for first load)
  const roomId = activeCall?.roomId ?? (routeMatch?.params as { roomId?: string })?.roomId;
  if (!roomId) return null;

  const isVisible = !!routeMatch && (routeMatch.params as { roomId?: string }).roomId === roomId;

  return (
    <div
      style={
        isVisible
          ? { position: 'fixed', inset: 0, zIndex: 50 }
          : { position: 'fixed', width: 0, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none' }
      }
    >
      <AdminVideoRoom roomId={roomId} />
    </div>
  );
};

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
                    {/* Always-on: keeps the call alive during in-app navigation */}
                    <AlwaysOnCallPage />
                    <ProfileCompletionGuard>
                    <Routes>
                      <Route path="/profile-completion" element={<ProfileCompletion />} />
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
                      <Route path="/api/auth/login" element={<Navigate to="/auth" replace />} />
                      <Route path="/ai-chat" element={<AIChat />} />
                      <Route path="/prayer-forum" element={<PrayerForum />} />
                      <Route path="/careme" element={<Careme />} />
                      <Route path="/careme-2026" element={<Careme2026 />} />
                      <Route path="/chemin-de-croix" element={<CheminDeCroix />} />
                      <Route path="/reports" element={<ActivityReports />} />
                      <Route path="/calls-lives" element={<CallsAndLives />} />
                      <Route path="/neuvaines" element={<Neuvaines />} />
                      <Route path="/neuvaines/:id" element={<NeuvaineDayView />} />
                      <Route path="/messe-office" element={<MesseOffice />} />
                      <Route path="/temoignages" element={<Temoignages />} />
                      <Route path="/chapelet" element={<Chapelet />} />
                      <Route path="/priere-quotidienne" element={<PriereQuotidienne />} />
                      <Route path="/dons" element={<Dons />} />
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
                      {/* These routes render null — AdminVideoRoom is in AlwaysOnCallPage */}
                      <Route path="/admin/video/:roomId" element={null} />
                      <Route path="/meeting/:roomId" element={null} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/admins" element={<AdminManagement />} />
                      <Route path="/admin/testimonials" element={<AdminTemoignages />} />
                      <Route path="/admin/donations" element={<AdminDons />} />
                      <Route path="/admin/feast-days" element={<AdminFeastDays />} />
                      <Route path="/admin/chapelet" element={<AdminChapelet />} />
                      <Route path="/admin/daily-prayer" element={<AdminPriereQuotidienne />} />
                      <Route path="/admin/news" element={<AdminNews />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/actualites/:id" element={<Actualites />} />
                      <Route path="/documents-3v" element={<Documents3V />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </ProfileCompletionGuard>
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
