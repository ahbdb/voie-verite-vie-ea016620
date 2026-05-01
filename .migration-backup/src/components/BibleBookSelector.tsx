import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Search } from 'lucide-react';
import bibleBooks from '@/data/bible-books.json';
import { getBookName, getBookAbbreviation } from '@/lib/bible-utils';

interface BookData {
  id: number;
  name: string;
  fileName: string;
  testament: 'old' | 'new';
  abbreviation: string;
  chapters: number;
  order: number;
  apocrypha?: boolean;
}

export const BibleBookSelector = ({ onBookSelect }: { onBookSelect?: (book: BookData) => void }) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTestament, setSelectedTestament] = useState<'all' | 'old' | 'new'>('all');
  const lang = i18n.language;

  const handleBookClick = (book: BookData) => {
    navigate(`/bible-book/${book.fileName}`);
    onBookSelect?.(book);
  };

  const filteredBooks = useMemo(() => {
    let filtered = bibleBooks.books as BookData[];
    if (selectedTestament !== 'all') {
      filtered = filtered.filter(book => book.testament === selectedTestament);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(book =>
        getBookName(book, lang).toLowerCase().includes(term) ||
        getBookAbbreviation(book, lang).toLowerCase().includes(term) ||
        book.name.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [searchTerm, selectedTestament, lang]);

  const oldTestamentBooks = (bibleBooks.books as BookData[]).filter((b: BookData) => b.testament === 'old' && !b.apocrypha);
  const apocryphaBooks = (bibleBooks.books as BookData[]).filter((b: BookData) => b.apocrypha);
  const newTestamentBooks = (bibleBooks.books as BookData[]).filter((b: BookData) => b.testament === 'new');

  const renderBookCard = (book: BookData, showDeutero = false) => (
    <Card
      key={book.fileName}
      className="cursor-pointer hover:bg-accent hover:border-primary transition-all"
      onClick={() => handleBookClick(book)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-semibold text-sm leading-tight">{getBookName(book, lang)}</h4>
            <p className="text-xs text-muted-foreground">{book.chapters} ch.</p>
          </div>
          <Badge variant={showDeutero ? "secondary" : "outline"} className="shrink-0 text-xs">
            {getBookAbbreviation(book, lang)}
          </Badge>
        </div>
        {book.apocrypha && showDeutero && (
          <Badge variant="secondary" className="text-xs mt-2">{t('bibleBookSelector.deuterocanonical')}</Badge>
        )}
      </CardContent>
    </Card>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-2" />
      <p className="text-muted-foreground">{t('bibleBookSelector.noBookFound')}</p>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('bibleBookSelector.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedTestament} onValueChange={(v) => setSelectedTestament(v as 'all' | 'old' | 'new')} defaultValue="all">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">{t('bibleBookSelector.allBooks', { count: bibleBooks.books.length })}</TabsTrigger>
          <TabsTrigger value="old">{t('bibleBookSelector.oldTestament', { count: oldTestamentBooks.length + apocryphaBooks.length })}</TabsTrigger>
          <TabsTrigger value="new">{t('bibleBookSelector.newTestament', { count: newTestamentBooks.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-[600px] border rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredBooks.map((book) => renderBookCard(book, true))}
            </div>
            {filteredBooks.length === 0 && renderEmpty()}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="old" className="mt-4">
          <ScrollArea className="h-[600px] border rounded-lg p-4">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-base mb-3">{t('bibleBookSelector.oldTestamentTitle')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredBooks.filter(b => b.testament === 'old' && !b.apocrypha).map((book) => renderBookCard(book))}
                </div>
              </div>

              {apocryphaBooks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-base mb-3">{t('bibleBookSelector.deuterocanonicalTitle')}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredBooks.filter(b => b.apocrypha).map((book) => renderBookCard(book, true))}
                  </div>
                </div>
              )}
            </div>
            {filteredBooks.filter(b => b.testament === 'old').length === 0 && renderEmpty()}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="new" className="mt-4">
          <ScrollArea className="h-[600px] border rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredBooks.filter(b => b.testament === 'new').map((book) => renderBookCard(book))}
            </div>
            {filteredBooks.filter(b => b.testament === 'new').length === 0 && renderEmpty()}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="text-center">
          <p className="font-semibold text-foreground">{oldTestamentBooks.length + apocryphaBooks.length}</p>
          <p>{t('bibleBookSelector.otBooks')}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">{newTestamentBooks.length}</p>
          <p>{t('bibleBookSelector.ntBooks')}</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground">{bibleBooks.books.length}</p>
          <p>{t('bibleBookSelector.total')}</p>
        </div>
      </div>
    </div>
  );
};
