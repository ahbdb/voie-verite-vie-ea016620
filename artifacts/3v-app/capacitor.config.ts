import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0d95312f577b405faca83354a904f40d',
  appName: 'voie-verite-vie',
  webDir: 'dist',
  server: {
    url: 'https://0d95312f-577b-405f-aca8-3354a904f40d.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#D4AF37',
      sound: 'beep.wav',
    },
  },
};

export default config;