import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createBroadcastNotification,
  sendBroadcastNotification,
  getBroadcastNotifications,
  BroadcastNotification,
} from '@/lib/broadcast-notification-service';

export const AdminNotificationPanel = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'greeting' | 'reminder' | 'announcement' | 'update'>('announcement');
  const [targetRole, setTargetRole] = useState<'all' | 'user' | 'admin' | null>('all');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recentNotications, setRecentNotifications] = useState<BroadcastNotification[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }

    setIsLoading(true);

    try {
      // Create the broadcast notification
      const broadcast = await createBroadcastNotification(title, body, {
        type,
        target_role: targetRole,
        scheduled_at: scheduleTime || undefined,
      });

      if (!broadcast) {
        toast.error('Erreur lors de la création de la notification');
        setIsLoading(false);
        return;
      }

      // If not scheduled, send immediately
      if (!scheduleTime) {
        const success = await sendBroadcastNotification(broadcast.id);

        if (success) {
          toast.success(`✅ Notification envoyée à ${getTargetText(targetRole)}`);
          resetForm();
        } else {
          toast.error('Erreur lors de l\'envoi');
        }
      } else {
        toast.success(`⏰ Notification programmée pour ${new Date(scheduleTime).toLocaleString('fr-FR')}`);
        resetForm();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Erreur: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setType('announcement');
    setTargetRole('all');
    setScheduleTime('');
  };

  const loadRecentNotifications = async () => {
    try {
      const notifs = await getBroadcastNotifications(10);
      setRecentNotifications(notifs);
      setShowRecent(!showRecent);
    } catch (err) {
      toast.error('Erreur lors du chargement');
    }
  };

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'greeting':
        return '👋';
      case 'reminder':
        return '⏰';
      case 'announcement':
        return '📢';
      case 'update':
        return '✨';
      default:
        return '📬';
    }
  };

  const getTargetText = (target: string | null) => {
    switch (target) {
      case 'all':
        return 'tous les utilisateurs';
      case 'user':
        return 'les utilisateurs';
      case 'admin':
        return 'les administrateurs';
      default:
        return 'tous les utilisateurs';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📢 Envoyer une Notification Globale
          </CardTitle>
          <CardDescription>
            Envoyez une notification à tous les utilisateurs ou à une catégorie spécifique.
            Les notifications restent visibles jusqu'à ce qu'elles soient lues.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendNotification} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Titre *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Bonne journée à tous ! 🌅"
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ex: N'oublie pas de prier aujourd'hui..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{body.length}/500</p>
            </div>

            {/* Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <Select value={type} onValueChange={(value: any) => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greeting">👋 Salutation</SelectItem>
                    <SelectItem value="reminder">⏰ Rappel</SelectItem>
                    <SelectItem value="announcement">📢 Annonce</SelectItem>
                    <SelectItem value="update">✨ Mise à jour</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Role */}
              <div>
                <label className="block text-sm font-medium mb-1">Destinataires</label>
                <Select value={targetRole || 'all'} onValueChange={(value: any) => setTargetRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">👥 Tous les utilisateurs</SelectItem>
                    <SelectItem value="user">👤 Les utilisateurs</SelectItem>
                    <SelectItem value="admin">🔑 Les administrateurs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium mb-1">
                ⏰ Programmer pour plus tard (optionnel)
              </label>
              <Input
                type="datetime-local"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
              <p className="text-xs text-gray-600 mt-1">
                Laissez vide pour envoyer immédiatement
              </p>
            </div>

            {/* Preview */}
            <div className="bg-gray-100 p-4 rounded border border-gray-300">
              <p className="text-xs text-gray-600 mb-2">APERÇU:</p>
              <div className="bg-white p-3 rounded border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span>{getTypeEmoji(type)}</span>
                  <p className="font-semibold text-sm">{title || 'Titre...'}</p>
                </div>
                {body && <p className="text-sm text-gray-600">{body}</p>}
                <p className="text-xs text-gray-400 mt-2">
                  Pour: {getTargetText(targetRole)}
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading || !title.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? 'Envoi...' : scheduleTime ? '⏰ Programmer' : '📤 Envoyer'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={loadRecentNotifications}
              >
                📋 Historique ({recentNotications.length})
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Notifications */}
      {showRecent && recentNotications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notifications Récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNotications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded border ${
                    notif.is_sent
                      ? 'bg-green-50 border-green-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{getTypeEmoji(notif.type)}</span>
                        <h4 className="font-semibold text-sm">{notif.title}</h4>
                      </div>
                      {notif.body && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notif.body}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>
                          {notif.is_sent ? '✅ Envoyée' : '⏳ En attente'}
                        </span>
                        <span>{getTargetText(notif.target_role)}</span>
                        <time>
                          {new Date(notif.created_at).toLocaleDateString('fr-FR')}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-indigo-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-sm">💡 Conseils</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-gray-700">
          <p>
            ✅ <strong>Salutations:</strong> Souhaitez une bonne journée aux utilisateurs chaque matin
          </p>
          <p>
            ✅ <strong>Rappels:</strong> Rappelez aux utilisateurs les événements importants
          </p>
          <p>
            ✅ <strong>Annonces:</strong> Annoncez de nouvelles fonctionnalités ou contenus
          </p>
          <p>
            ✅ <strong>Persistance:</strong> Les notifications restent jusqu'à ce qu'elles soient lues
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
