import html2canvas from 'html2canvas';

export interface SharePreviewData {
  title: string;
  subtitle?: string;
  reading?: string;
  text?: string;
  meditation?: string;
  prayer?: string;
  adoration?: string;
  number?: number;
  type: 'station' | 'day';
}

/**
 * Capture le Dialog complet (sans troncature) et ajoute un footer branding
 */
export const generateShareImage = async (data: SharePreviewData): Promise<Blob | null> => {
  try {
    console.log('📸 Capture du Dialog complet');
    
    // Récupérer le Dialog
    const dialogContent = document.getElementById('share-source');
    
    if (!dialogContent) {
      console.error('❌ Dialog non trouvé');
      return null;
    }
    
    console.log('✅ Dialog trouvé');
    
    // Cloner le Dialog pour ne pas modifier l'original
    const clonedContent = dialogContent.cloneNode(true) as HTMLElement;
    
    // Supprimer TOUS les boutons et icônes
    // 1. Supprimer tous les éléments button
    const allButtons = clonedContent.querySelectorAll('button');
    allButtons.forEach(btn => btn.remove());
    console.log('🗑️ Tous les boutons supprimés');
    
    // 2. Supprimer les icônes SVG (X de fermeture, etc)
    const allSvgs = clonedContent.querySelectorAll('svg');
    allSvgs.forEach(svg => {
      // Vérifier que le SVG n'est pas dans le footer branding
      if (!svg.closest('footer')) {
        svg.remove();
      }
    });
    console.log('🗑️ Icônes SVG supprimées');
    
    // 3. Supprimer les sections avec boutons (divs border-t qui contiennent des buttons remnants)
    const allDivs = clonedContent.querySelectorAll('div');
    const buttonsToRemove: Element[] = [];
    
    allDivs.forEach(div => {
      const classList = div.getAttribute('class') || '';
      // Chercher les divs avec border-t (bordure top) ET qui contiennent des boutons
      if ((classList.includes('border-t') || classList.includes('pt-4') || classList.includes('pt-6')) && 
          div.querySelector('button')) {
        // Vérifier que c'est un parent direct ou proche de boutons
        const buttons = div.querySelectorAll('button');
        if (buttons.length > 0) {
          buttonsToRemove.push(div);
          console.log('🗑️ Div avec boutons marquée pour suppression');
        }
      }
    });
    
    // Supprimer les divs identifiées
    buttonsToRemove.forEach(div => {
      if (div.parentElement && clonedContent.contains(div)) {
        div.remove();
        console.log('🗑️ Section des boutons supprimée');
      }
    });
    
    // Ajouter le footer branding (une seule ligne, sans box)
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: -30px;
      padding: 0;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      flex-wrap: wrap;
      width: 100%;
      box-sizing: border-box;
    `;
    
    footer.innerHTML = `
      <img src="/logo-3v.png" alt="Logo 3V" style="height: 40px;">
      <span style="color: #581c87; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">VOIE, VÉRITÉ, VIE</span>
      <span style="color: #666; font-size: 12px;">voie-verite-vie.netlify.app</span>
    `;
    
    clonedContent.appendChild(footer);
    console.log('✨ Footer branding compact ajouté');
    
    // Récupérer la largeur réelle du dialogue affiché à l'écran
    const dialogElement = document.getElementById('share-source');
    const actualWidth = dialogElement ? dialogElement.offsetWidth : window.innerWidth;
    
    console.log(`📐 Largeur réelle du dialogue: ${actualWidth}px`);
    
    // Ajouter temporairement le clone au DOM
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      background: white;
      width: ${actualWidth}px;
    `;
    
    wrapper.appendChild(clonedContent);
    document.body.appendChild(wrapper);
    
    // Sauvegarder les styles originaux du Dialog
    const originalMaxHeight = clonedContent.style.maxHeight;
    const originalOverflow = clonedContent.style.overflow;
    const originalHeight = clonedContent.style.height;
    const originalWidth = clonedContent.style.width;
    
    // Retirer les contraintes pour capturer tout
    clonedContent.style.width = '100%';
    clonedContent.style.maxHeight = 'none';
    clonedContent.style.overflow = 'visible';
    clonedContent.style.height = 'auto';
    
    console.log('🔧 Styles modifiés pour capture complète');
    
    // Attendre que le DOM se mette à jour et que les calculs CSS se terminent
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Adapter l'échelle pour la qualité du rendu selon la lageur
    let scale = 2;
    
    if (actualWidth < 480) {
      scale = 1.5;  // Petite largeur
    } else if (actualWidth < 768) {
      scale = 1.8;  // Largeur moyenne
    } else {
      scale = 2;    // Largeur grande
    }
    
    console.log(`📱 Échelle adaptée: ${scale}x pour largeur ${actualWidth}px`);
    
    // Capturer avec les dimensions réelles du dialogue
    const canvas = await html2canvas(clonedContent, {
      backgroundColor: '#ffffff',
      scale: scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 0,
      windowHeight: clonedContent.scrollHeight,
      width: actualWidth,
    });
    
    // Nettoyer le wrapper temporaire
    document.body.removeChild(wrapper);
    
    console.log('✅ Image capturée:', canvas.width, 'x', canvas.height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('💾 Image:', blob.size, 'bytes');
        }
        resolve(blob);
      }, 'image/png', 1.0);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return null;
  }
};

/**
 * Partage l'image
 */
export const shareImage = async (blob: Blob, title: string): Promise<boolean> => {
  try {
    console.log('🔄 Partage image:', blob.size, 'bytes');
    
    if (!blob || blob.size === 0) {
      return false;
    }

    const isDesktop = !/android|iphone|ipad|ipod|webos/i.test(navigator.userAgent.toLowerCase());

    const file = new File([blob], `${title.replace(/\s+/g, '-')}.png`, {
      type: 'image/png',
    });

    // Essayer Web Share sur mobile
    if (!isDesktop && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: title,
          text: '✝️ Voie, Vérité, Vie',
        });
        console.log('✅ Partage Web Share réussi');
        return true;
      } catch (err) {
        console.error('⚠️ Web Share échoué, fallback téléchargement:', err);
        // Continuer au téléchargement en fallback
      }
    }
    
    // Télécharger (desktop ou fallback mobile)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    
    console.log(`📥 Téléchargement lancé: ${title}`);
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 500);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur partage:', error);
    return false;
  }
};
