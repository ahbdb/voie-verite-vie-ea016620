export interface SiteLink {
  nameKey: string;
  href: string;
  /** icon name (mapped in UI) */
  icon?: string;
  showInNav?: boolean; // default true
}

export interface SiteCategory {
  id: string;
  titleKey: string;
  items: SiteLink[];
}

export const siteLinks: SiteCategory[] = [
  {
    id: 'principal',
    titleKey: 'nav.main',
    items: [
      { nameKey: 'common.home', href: '/', icon: 'Cross' },
      { nameKey: 'common.about', href: '/about', icon: 'BookOpen' },
      { nameKey: 'common.creator', href: '/createur', icon: 'User' },
    ],
  },
  {
    id: 'spiritual',
    titleKey: 'nav.spiritualPractices',
    items: [
      { nameKey: 'common.biblicalReading', href: '/biblical-reading', icon: 'BookOpen' },
      { nameKey: 'common.prayerForum', href: '/prayer-forum', icon: 'Heart' },
      { nameKey: 'common.lent2026', href: '/careme', icon: 'Cross' },
      { nameKey: 'common.stationsOfCross', href: '/chemin-de-croix', icon: 'Cross' },
      { nameKey: 'common.novenas', href: '/neuvaines', icon: 'BookOpen' },
    ],
  },
  {
    id: 'community',
    titleKey: 'nav.community',
    items: [
      { nameKey: 'common.activities', href: '/activities', icon: 'Calendar' },
      { nameKey: 'common.gallery', href: '/gallery', icon: 'Camera' },
      { nameKey: 'common.callsAndLives', href: '/calls-lives', icon: 'Radio' },
      { nameKey: 'reports.activityReports', href: '/reports', icon: 'FileText' },
    ],
  },
  {
    id: 'help',
    titleKey: 'nav.helpContact',
    items: [
      { nameKey: 'common.faq', href: '/faq', icon: 'HelpCircle' },
      { nameKey: 'common.contact', href: '/contacts', icon: 'Mail' },
    ],
  },
  {
    id: 'tools',
    titleKey: 'nav.tools',
    items: [
      { nameKey: 'common.profile', href: '/profile', icon: 'User' },
      { nameKey: 'common.aiAssistant', href: '/ai-chat', icon: 'Bot' },
      { nameKey: 'common.settings', href: '/settings', icon: 'Settings' },
    ],
  },
];

export default siteLinks;
