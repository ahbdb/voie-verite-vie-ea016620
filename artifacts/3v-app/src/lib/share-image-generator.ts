import html2canvas from 'html2canvas';

export interface ShareContent {
  title: string;
  subtitle?: string;
  reading?: string;
  text?: string;
  meditation?: string;
  prayer?: string;
  adoration?: string;
  number?: number;
}

export interface BrandedImageOptions {
  content: string;
  title: string;
  width?: number;
  includeFooter?: boolean;
}

/**
 * Crée une image avec le branding 3V (logo, YouTube, URL)
 */
export const createBrandedImage = async (options: BrandedImageOptions): Promise<HTMLCanvasElement> => {
  const { content, title, width = 1080, includeFooter = true } = options;
  
  const container = document.createElement('div');
  container.style.cssText = `
    background: linear-gradient(to bottom, rgb(248, 250, 252), rgb(255, 255, 255));
    padding: 40px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    width: ${width}px;
    box-sizing: border-box;
  `;

  let html = `
    <div style="text-align: center; margin-bottom: 40px;">
      <img src="/logo-3v.png" alt="Logo 3V" style="height: 80px; margin-bottom: 20px;">
      <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 10px 0; color: #581c87;">
        ${title}
      </h1>
    </div>
    <div style="margin-bottom: 40px;">
      ${content}
    </div>
  `;

  if (includeFooter) {
    html += `
      <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5d4ff; text-align: center;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px;">
          <img src="/logo-3v.png" alt="Logo 3V" style="height: 32px;">
          <div style="font-weight: 600; color: #581c87; font-size: 16px;">VOIE, VÉRITÉ, VIE</div>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff0000" style="margin-top: 2px;">
            <path d="M19.615 3.175c-3.673-3.059-9.158-3.059-12.831 0-3.673 3.059-3.673 8.017 0 11.076 1.836 1.529 4.261 2.529 6.916 2.529 2.655 0 5.08-1 6.916-2.529 3.672-3.059 3.672-8.017-.001-11.076zm-2.39 14.868c-1.225.703-2.665 1.109-4.202 1.109-1.537 0-2.977-.406-4.202-1.109-2.44-1.403-4.085-3.84-4.085-6.701 0-4.368 3.529-7.906 7.887-7.906 4.358 0 7.887 3.538 7.887 7.906 0 2.861-1.645 5.298-4.285 6.701z"/>
          </svg>
          <span style="color: #4b5563; font-size: 14px;">YouTube</span>
        </div>
        <div style="color: #6b7280; font-size: 13px; word-break: break-all;">
          https://voie-verite-vie.netlify.app
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  document.body.appendChild(container);

  const canvas = await html2canvas(container, {
    backgroundColor: '#f8fafc',
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
  });

  document.body.removeChild(container);
  return canvas;
};

/**
 * Génère plusieurs images et les télécharge en ZIP
 */
export const generateMultipleImages = async (itemsData: Array<{ content: string; title: string; filename: string }>) => {
  try {
    const canvases: Array<{ canvas: HTMLCanvasElement; filename: string }> = [];

    // Générer toutes les images
    for (const item of itemsData) {
      const canvas = await createBrandedImage({
        content: item.content,
        title: item.title,
      });
      canvases.push({ canvas, filename: item.filename });
    }

    // Télécharger chaque image individuelle
    for (const { canvas, filename } of canvases) {
      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setTimeout(resolve, 200); // Délai entre les téléchargements
          } else {
            resolve(null);
          }
        });
      });
    }

    alert(`✅ ${itemsData.length} images téléchargées avec succès!`);
  } catch (error) {
    console.error('Erreur lors de la génération des images:', error);
    alert('Erreur lors de la génération des images. Veuillez réessayer.');
  }
};

/**
 * Capture un élément DOM et le partage comme image PNG
 */
export const captureAndShareElement = async (element: HTMLElement, filename: string) => {
  try {
    if (!element) {
      console.error('Élément non trouvé');
      return;
    }

    // Ajouter une marge visuelle
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      padding: 20px;
      background: white;
    `;
    wrapper.appendChild(element.cloneNode(true));
    document.body.appendChild(wrapper);

    // Capturer l'élément
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    // Nettoyer
    document.body.removeChild(wrapper);

    // Convertir en blob et partager
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Erreur: impossible de créer l\'image');
        return;
      }

      const file = new File([blob], `${filename}.png`, {
        type: 'image/png',
      });

      // Utiliser l'API Web Share si disponible
      if ((navigator as any).share && (navigator as any).canShare?.({ files: [file] })) {
        try {
          await (navigator as any).share({
            files: [file],
            title: filename,
          });
        } catch (err) {
          downloadImage(canvas, filename);
        }
      } else {
        downloadImage(canvas, filename);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la capture:', error);
    alert('Erreur lors de la capture de l\'écran. Veuillez réessayer.');
  }
};

/**
 * Génère une image PNG à partir du contenu et la partage
 */
export const generateAndShareImage = async (content: ShareContent) => {
  try {
    // Créer un conteneur temporaire pour le contenu
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 1200px;
      background: white;
      padding: 60px;
      color: #1f2937;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    // Header avec numéro et titre
    let html = `
      <div style="text-align: center; margin-bottom: 40px;">
        ${content.number ? `<div style="font-size: 72px; font-weight: bold; color: #7c3aed; margin-bottom: 15px;">${String(content.number).padStart(2, '0')}</div>` : ''}
        <h1 style="font-size: 48px; font-weight: bold; margin: 0 0 15px 0; color: #581c87;">
          ${content.title}
        </h1>
        ${content.subtitle ? `<p style="font-size: 18px; color: #9333ea; margin: 0; font-style: italic;">${content.subtitle}</p>` : ''}
        ${content.reading ? `<p style="font-size: 16px; color: #a855f7; margin: 15px 0 0 0; font-weight: 500;">${content.reading}</p>` : ''}
      </div>
    `;

    // Texte du contenu
    if (content.text) {
      html += `
        <div style="background: #ede9fe; padding: 30px; margin-bottom: 30px; border-left: 6px solid #7c3aed; font-size: 18px; line-height: 1.8; color: #3730a3; font-style: italic;">
          "${content.text}"
        </div>
      `;
    }

    // Méditation
    if (content.meditation) {
      html += `
        <div style="margin-bottom: 30px; padding: 20px; background: #f3e8ff; border-radius: 8px; border: 1px solid #ddd6fe;">
          <h3 style="font-size: 18px; font-weight: bold; color: #6b21a8; margin-bottom: 12px;">💭 Méditation</h3>
          <p style="font-size: 16px; line-height: 1.7; margin: 0; color: #4c1d95;">${content.meditation}</p>
        </div>
      `;
    }

    // Prière
    if (content.prayer) {
      html += `
        <div style="margin-bottom: 30px; padding: 20px; background: #faf5ff; border-radius: 8px; border: 1px solid #e9d5ff;">
          <h3 style="font-size: 18px; font-weight: bold; color: #6b21a8; margin-bottom: 12px;">🙏 Prière</h3>
          <p style="font-size: 16px; line-height: 1.7; margin: 0; color: #5b21b6; font-style: italic;">${content.prayer}</p>
        </div>
      `;
    }

    // Adoration
    if (content.adoration) {
      html += `
        <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 3px solid #ddd6fe; font-style: italic; font-size: 16px; line-height: 2; color: #6b21a8;">
          ${content.adoration.split('\n').join('<br/>')}
        </div>
      `;
    }

    // Watermark
    html += `
      <div style="text-align: center; margin-top: 40px; font-size: 14px; color: #a78bfa; font-weight: 500;">
        Voie, Vérité, Vie — Chemin de Croix
      </div>
    `;

    container.innerHTML = html;
    document.body.appendChild(container);

    // Générer l'image
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    // Nettoyer le conteneur temporaire
    document.body.removeChild(container);

    // Convertir en blob et partager
    canvas.toBlob(async (blob) => {
      if (!blob) {
        console.error('Erreur: impossible de créer l\'image');
        return;
      }

      const file = new File([blob], `${content.title.replace(/\s+/g, '-')}.png`, {
        type: 'image/png',
      });

      // Essayer d'utiliser l'API Web Share si disponible
      if ((navigator as any).share && (navigator as any).canShare?.({ files: [file] })) {
        try {
          await (navigator as any).share({
            files: [file],
            title: content.title,
            text: content.adoration || 'Chemin de Croix',
          });
        } catch (err) {
          // Fallback: télécharger le fichier
          downloadImage(canvas, content.title);
        }
      } else {
        // Fallback: télécharger le fichier
        downloadImage(canvas, content.title);
      }
    });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'image:', error);
    alert('Erreur lors de la génération de l\'image. Veuillez réessayer.');
  }
};

/**
 * Télécharge l'image générée
 */
export const downloadImage = (canvas: HTMLCanvasElement, title: string) => {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${title.replace(/\s+/g, '-')}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
