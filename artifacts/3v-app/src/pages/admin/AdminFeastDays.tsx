import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { loadFeasts, saveFeasts, DEFAULT_FEASTS, type ChristianFeast } from '@/lib/christian-feasts';
import { Plus, Pencil, Trash2, CalendarDays, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const ANIMATION_TYPES = [
  { value: 'garland', label: '🎊 Guirlandes' },
  { value: 'banner', label: '🎏 Bannière' },
  { value: 'fireworks', label: '🎆 Feux d\'artifice' },
  { value: 'candles', label: '🕯️ Bougies' },
  { value: 'cross', label: '✝️ Croix lumineuse' },
  { value: 'dove', label: '🕊️ Colombe' },
];

const FEAST_TYPES = [
  { value: 'solemnity', label: 'Solennité' },
  { value: 'feast', label: 'Fête' },
  { value: 'memorial', label: 'Mémorial' },
  { value: 'anniversary', label: 'Anniversaire' },
  { value: 'custom', label: 'Personnalisé' },
];

const VARIABLE_DATE_OPTIONS = [
  { value: 'variable-easter', label: 'Pâques (variable)' },
  { value: 'variable-pentecost', label: 'Pentecôte (variable)' },
  { value: 'variable-ascension', label: 'Ascension (variable)' },
  { value: 'variable-trinity', label: 'Trinité (variable)' },
  { value: 'variable-corpus', label: 'Fête-Dieu (variable)' },
  { value: 'variable-sacred-heart', label: 'Sacré-Cœur (variable)' },
  { value: 'variable-ash-wednesday', label: 'Mercredi des Cendres (variable)' },
  { value: 'variable-palm-sunday', label: 'Rameaux (variable)' },
  { value: 'variable-advent', label: '1er Dimanche de l\'Avent (variable)' },
];

const MONTHS = [
  '01-Janvier', '02-Février', '03-Mars', '04-Avril', '05-Mai', '06-Juin',
  '07-Juillet', '08-Août', '09-Septembre', '10-Octobre', '11-Novembre', '12-Décembre',
];

const EMPTY_FEAST: Omit<ChristianFeast, 'id'> = {
  name: '',
  date: '01-01',
  type: 'feast',
  animationType: 'garland',
  color: '#c9a227',
  message: '',
  icon: '✝️',
  enabled: true,
};

export default function AdminFeastDays() {
  const [feasts, setFeasts] = useState<ChristianFeast[]>([]);
  const [editingFeast, setEditingFeast] = useState<ChristianFeast | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isVariable, setIsVariable] = useState(false);
  const [dateMonth, setDateMonth] = useState('01');
  const [dateDay, setDateDay] = useState('01');

  useEffect(() => {
    setFeasts(loadFeasts());
  }, []);

  const persist = (updated: ChristianFeast[]) => {
    setFeasts(updated);
    saveFeasts(updated);
  };

  const openNew = () => {
    const newFeast: ChristianFeast = { ...EMPTY_FEAST, id: `custom-${Date.now()}` };
    setEditingFeast(newFeast);
    setIsNew(true);
    setIsVariable(false);
    setDateMonth('01');
    setDateDay('01');
    setDialogOpen(true);
  };

  const openEdit = (f: ChristianFeast) => {
    setEditingFeast({ ...f });
    setIsNew(false);
    if (f.date.startsWith('variable-')) {
      setIsVariable(true);
    } else {
      setIsVariable(false);
      const [m, d] = f.date.split('-');
      setDateMonth(m);
      setDateDay(d);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingFeast) return;
    if (!editingFeast.name.trim()) { toast.error('Le nom est requis'); return; }
    if (!editingFeast.message.trim()) { toast.error('Le message est requis'); return; }

    const feast: ChristianFeast = {
      ...editingFeast,
      date: isVariable ? (editingFeast.date.startsWith('variable-') ? editingFeast.date : 'variable-easter') : `${dateMonth}-${dateDay.padStart(2, '0')}`,
    };

    if (isNew) {
      persist([...feasts, feast]);
      toast.success(`"${feast.name}" ajoutée !`);
    } else {
      persist(feasts.map(f => f.id === feast.id ? feast : f));
      toast.success(`"${feast.name}" mise à jour !`);
    }
    setDialogOpen(false);
  };

  const toggleEnabled = (id: string) => {
    persist(feasts.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const deleteFeast = (id: string) => {
    const feast = feasts.find(f => f.id === id);
    persist(feasts.filter(f => f.id !== id));
    toast.success(`"${feast?.name}" supprimée`);
  };

  const resetToDefaults = () => {
    persist(DEFAULT_FEASTS);
    toast.success('Calendrier réinitialisé aux fêtes par défaut');
  };

  const getDateLabel = (date: string) => {
    if (date.startsWith('variable-')) {
      return VARIABLE_DATE_OPTIONS.find(v => v.value === date)?.label?.replace(' (variable)', '') || 'Variable';
    }
    const [m, d] = date.split('-');
    const monthName = MONTHS.find(mo => mo.startsWith(m))?.split('-')[1] || m;
    return `${parseInt(d)} ${monthName}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-cinzel font-bold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-cathedral-gold" />
                  Fêtes chrétiennes
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Gérez les célébrations avec animations — {feasts.filter(f => f.enabled).length} active(s) sur {feasts.length}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetToDefaults} className="gap-2">
                  <RefreshCw className="w-3.5 h-3.5" /> Réinitialiser
                </Button>
                <Button size="sm" onClick={openNew} className="gap-2">
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="space-y-2">
            {feasts.map((feast, idx) => (
              <motion.div
                key={feast.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 transition-all',
                  feast.enabled ? 'border-border bg-card' : 'border-border/30 bg-muted/30 opacity-60'
                )}
              >
                <div className="text-2xl shrink-0 w-9 text-center">{feast.icon}</div>
                <div
                  className="w-2 h-10 rounded-full shrink-0"
                  style={{ background: feast.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-none truncate">{feast.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{getDateLabel(feast.date)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground/60 border border-border/40 rounded-full px-1.5 py-0.5">
                      {FEAST_TYPES.find(t => t.value === feast.type)?.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {ANIMATION_TYPES.find(a => a.value === feast.animationType)?.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={feast.enabled}
                    onCheckedChange={() => toggleEnabled(feast.id)}
                    aria-label="Activer/Désactiver"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(feast)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteFeast(feast.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}

            {feasts.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune fête configurée</p>
                <Button size="sm" onClick={openNew} className="mt-4 gap-2">
                  <Plus className="w-3.5 h-3.5" /> Ajouter la première
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Edit / New Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'Nouvelle fête' : 'Modifier la fête'}</DialogTitle>
          </DialogHeader>
          {editingFeast && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nom *</label>
                <Input value={editingFeast.name} onChange={e => setEditingFeast({ ...editingFeast, name: e.target.value })} placeholder="Ex: Noël" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Icône (emoji)</label>
                <Input value={editingFeast.icon} onChange={e => setEditingFeast({ ...editingFeast, icon: e.target.value })} placeholder="✝️" className="w-24" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Type de date</label>
                <div className="flex gap-2 mb-3">
                  <Button size="sm" variant={!isVariable ? 'default' : 'outline'} onClick={() => setIsVariable(false)}>
                    Date fixe
                  </Button>
                  <Button size="sm" variant={isVariable ? 'default' : 'outline'} onClick={() => setIsVariable(true)}>
                    Date variable (liturgique)
                  </Button>
                </div>
                {isVariable ? (
                  <Select
                    value={editingFeast.date.startsWith('variable-') ? editingFeast.date : ''}
                    onValueChange={v => setEditingFeast({ ...editingFeast, date: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Choisir la fête liturgique" /></SelectTrigger>
                    <SelectContent>
                      {VARIABLE_DATE_OPTIONS.map(v => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Select value={dateMonth} onValueChange={setDateMonth}>
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => (
                          <SelectItem key={m} value={m.split('-')[0]}>{m.split('-')[1]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1} max={31}
                      value={parseInt(dateDay)}
                      onChange={e => setDateDay(String(e.target.value).padStart(2, '0'))}
                      className="w-20"
                      placeholder="Jour"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type de fête</label>
                <Select value={editingFeast.type} onValueChange={v => setEditingFeast({ ...editingFeast, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FEAST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Animation</label>
                <Select value={editingFeast.animationType} onValueChange={v => setEditingFeast({ ...editingFeast, animationType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANIMATION_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Couleur principale</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editingFeast.color}
                    onChange={e => setEditingFeast({ ...editingFeast, color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground font-mono">{editingFeast.color}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Message de célébration *</label>
                <textarea
                  value={editingFeast.message}
                  onChange={e => setEditingFeast({ ...editingFeast, message: e.target.value })}
                  placeholder="Ex: Joyeux Noël ! Que la lumière du Christ illumine votre cœur."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={editingFeast.enabled}
                  onCheckedChange={v => setEditingFeast({ ...editingFeast, enabled: v })}
                />
                <label className="text-sm text-foreground">Activer cette fête</label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button className="flex-1" onClick={handleSave}>
                  {isNew ? 'Ajouter' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
