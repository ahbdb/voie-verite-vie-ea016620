/**
 * Génère les fichiers MP3 du Chapelet via Microsoft Edge TTS (gratuit, sans compte).
 *
 * Usage :
 *   npm install msedge-tts --save-dev
 *   node scripts/generate-chapelet-audio.mjs
 *
 * Les fichiers sont écrits dans public/audio/chapelet/
 * Committez ensuite ce dossier pour que Netlify les serve.
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { writeFileSync, mkdirSync, existsSync, renameSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Accept --out <path> so the script can run from any working directory
const outArgIdx = process.argv.indexOf('--out');
const OUT_DIR = outArgIdx !== -1
  ? process.argv[outArgIdx + 1]
  : join(__dirname, '../public/audio/chapelet');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ── Voix disponibles (fr-FR) ──────────────────────────────────────────────────
// fr-FR-DeniseNeural  → voix féminine
// fr-FR-HenriNeural   → voix masculine
const VOICE = 'fr-FR-HenriNeural';

// ── Textes des prières ────────────────────────────────────────────────────────

const NOTRE_PERE = `Notre Père, qui es aux cieux,
que ton nom soit sanctifié,
que ton règne vienne,
que ta volonté soit faite sur la terre comme au ciel.
Donne-nous aujourd'hui notre pain de ce jour.
Pardonne-nous nos offenses,
comme nous pardonnons aussi à ceux qui nous ont offensés.
Et ne nous laisse pas entrer en tentation,
mais délivre-nous du Mal. Amen.`;

const JE_VOUS_SALUE = `Je vous salue, Marie, pleine de grâces,
le Seigneur est avec vous.
Vous êtes bénie entre toutes les femmes,
et Jésus, le fruit de vos entrailles, est béni.
Sainte Marie, Mère de Dieu,
priez pour nous, pauvres pécheurs,
maintenant et à l'heure de notre mort. Amen.`;

const GLOIRE_AU_PERE = `Gloire au Père, au Fils et au Saint-Esprit,
comme il était au commencement, maintenant et toujours,
dans les siècles des siècles. Amen.`;

const O_MON_JESUS = `Ô mon bon et doux Jésus, pardonnez-nous nos péchés,
préservez-nous du feu de l'enfer,
attirez au ciel toutes les âmes,
secourez spécialement celles qui ont le plus besoin de votre miséricorde.`;

const JE_CROIS_EN_DIEU = `Je crois en Dieu, le Père tout-puissant,
Créateur du ciel et de la terre.
Et en Jésus-Christ, son Fils unique, notre Seigneur,
qui a été conçu du Saint-Esprit, est né de la Vierge Marie,
a souffert sous Ponce Pilate,
a été crucifié, est mort et a été enseveli,
est descendu aux enfers,
le troisième jour est ressuscité des morts,
est monté aux cieux,
est assis à la droite de Dieu le Père tout-puissant,
d'où il viendra juger les vivants et les morts.
Je crois au Saint-Esprit,
à la Sainte Église catholique,
à la communion des saints,
à la rémission des péchés,
à la résurrection de la chair,
à la vie éternelle. Amen.`;

const SALVE_REGINA = `Salve Regina, Mère de miséricorde,
notre vie, notre douceur, notre espérance, salut !
Vers vous nous crions, pauvres enfants d'Ève exilés.
Vers vous nous soupirons, gémissant et pleurant dans cette vallée de larmes.
Ô vous, notre avocate, tournez vers nous vos yeux miséricordieux.
Et après cet exil, montrez-nous Jésus, le fruit béni de vos entrailles.
Ô clémente, ô pieuse, ô douce Vierge Marie. Amen.`;

// ── Mystères ──────────────────────────────────────────────────────────────────

const ORDINALS = ['Premier', 'Deuxième', 'Troisième', 'Quatrième', 'Cinquième'];

const MYSTERY_SETS = [
  {
    key: 'joyful',
    label: 'joyeux',
    mysteries: [
      { title: "L'Annonciation", fruit: "L'humilité", ref: 'Luc 1, 26 à 38', text: "L'ange Gabriel fut envoyé par Dieu dans une ville de Galilée, appelée Nazareth, à une vierge fiancée à un homme de la maison de David, nommé Joseph. Le nom de la vierge était Marie." },
      { title: 'La Visitation', fruit: "L'amour du prochain", ref: 'Luc 1, 39 à 56', text: "Dès qu'Élisabeth entendit la salutation de Marie, l'enfant tressaillit en elle. Élisabeth fut remplie de l'Esprit Saint et s'écria : Tu es bénie entre toutes les femmes et le fruit de tes entrailles est béni !" },
      { title: 'La Nativité de Jésus', fruit: "L'esprit de pauvreté et le détachement des biens", ref: 'Luc 2, 1 à 20', text: "Elle enfanta son fils premier-né, l'emmaillota et le coucha dans une mangeoire, parce qu'il n'y avait pas de place pour eux dans la salle commune." },
      { title: 'La Présentation de Jésus au Temple', fruit: "L'obéissance et la pureté", ref: 'Luc 2, 22 à 40', text: "Syméon prit l'enfant dans ses bras et bénit Dieu : Maintenant, Seigneur, tu peux laisser ton serviteur s'en aller en paix, car mes yeux ont vu ton salut que tu as préparé à la face de tous les peuples." },
      { title: "Le Recouvrement de Jésus au Temple", fruit: "La piété filiale et la fidélité à la vocation", ref: 'Luc 2, 41 à 52', text: "Au bout de trois jours, ses parents le trouvèrent dans le Temple, assis au milieu des docteurs de la Loi, les écoutant et les interrogeant. Et sa mère lui dit : Mon enfant, pourquoi nous as-tu fait cela ?" },
    ],
  },
  {
    key: 'luminous',
    label: 'lumineux',
    mysteries: [
      { title: 'Le Baptême de Jésus au Jourdain', fruit: "L'ouverture à l'Esprit Saint", ref: 'Matthieu 3, 13 à 17', text: "Jésus fut baptisé et, à l'instant, il remonta de l'eau. Le ciel s'ouvrit et il vit l'Esprit de Dieu descendre comme une colombe et venir sur lui. Et une voix venant du ciel disait : Celui-ci est mon Fils bien-aimé, en qui j'ai mis toute ma faveur." },
      { title: 'Les Noces de Cana', fruit: "La confiance en Marie et en la Parole du Christ", ref: 'Jean 2, 1 à 11', text: "La mère de Jésus lui dit : Ils n'ont plus de vin. Sa mère dit aux serviteurs : Faites tout ce qu'il vous dira. Jésus leur dit : Remplissez les jarres d'eau. Tel fut le premier des signes miraculeux que Jésus accomplit." },
      { title: "L'Annonce du Royaume de Dieu", fruit: "La conversion et la confiance en Dieu", ref: 'Marc 1, 14 à 15', text: "Jésus se rendit en Galilée, proclamant la Bonne Nouvelle de Dieu : Les temps sont accomplis et le Règne de Dieu est tout proche. Repentez-vous et croyez à la Bonne Nouvelle." },
      { title: 'La Transfiguration', fruit: "Le désir ardent de la sainteté", ref: 'Matthieu 17, 1 à 8', text: "Jésus fut transfiguré devant eux, son visage devint brillant comme le soleil. Une voix disait depuis la nuée : Celui-ci est mon Fils bien-aimé, en qui j'ai mis toute ma faveur. Écoutez-le." },
      { title: "L'Institution de l'Eucharistie", fruit: "L'adoration et l'amour eucharistiques", ref: 'Luc 22, 19 à 20', text: "Puis, prenant du pain et rendant grâce, il le rompit et le leur donna, en disant : Ceci est mon corps, donné pour vous. Faites cela en mémoire de moi. Il fit de même pour la coupe, après le repas." },
    ],
  },
  {
    key: 'sorrowful',
    label: 'douloureux',
    mysteries: [
      { title: "L'Agonie à Gethsémani", fruit: "La contrition et le repentir de nos péchés", ref: 'Luc 22, 39 à 46', text: "Dans son angoisse, Jésus priait avec plus d'insistance, et sa sueur devint comme des gouttes de sang tombant à terre. Il dit : Père, si tu veux, éloigne de moi cette coupe ; cependant, que ce soit ta volonté et non la mienne qui se réalise." },
      { title: 'La Flagellation', fruit: "La mortification et la pénitence", ref: 'Jean 19, 1', text: "Alors Pilate prit Jésus et le fit flageller. Ce n'est pas lui que je trouve coupable, dit Pilate. C'est pourquoi je vais le faire flageller, puis je le relâcherai." },
      { title: "Le Couronnement d'épines", fruit: "Le courage moral et le mépris des humiliations", ref: 'Jean 19, 2 à 3', text: "Les soldats tressèrent une couronne d'épines, la posèrent sur sa tête et le revêtirent d'un manteau de pourpre. Ils s'approchaient de lui et disaient : Salut, roi des Juifs ! Et ils lui donnaient des gifles." },
      { title: 'Le Portement de la Croix', fruit: "La patience et la persévérance dans les épreuves", ref: 'Luc 23, 26 à 32', text: "Comme ils l'emmenaient, ils prirent un certain Simon de Cyrène qui revenait des champs, et ils le chargèrent de la croix pour qu'il la porte derrière Jésus. Jésus dit : Si quelqu'un veut marcher derrière moi, qu'il renonce à lui-même." },
      { title: 'La Crucifixion et la Mort de Jésus', fruit: "La grâce de la persévérance finale et la rémission des péchés", ref: 'Jean 19, 25 à 30', text: "Près de la croix de Jésus se tenaient sa mère et Marie de Magdala. Jésus dit à sa mère : Femme, voici ton fils. Puis au disciple : Voici ta mère. Puis, baissant la tête, il remit l'esprit." },
    ],
  },
  {
    key: 'glorious',
    label: 'glorieux',
    mysteries: [
      { title: 'La Résurrection de Jésus', fruit: "La foi vivante et la joie pascale", ref: 'Jean 20, 1 à 18', text: "Le premier jour de la semaine, Marie de Magdala se rend au tombeau de grand matin. Elle vit que la pierre avait été enlevée du tombeau. Jésus lui dit : Ne me retiens pas, car je ne suis pas encore monté vers le Père." },
      { title: "L'Ascension de Jésus", fruit: "L'espérance des biens célestes et le désir du ciel", ref: 'Actes 1, 9 à 11', text: "Il fut emporté sous leurs yeux, et une nuée le déroba à leur regard. Deux hommes en vêtements blancs leur dirent : Hommes de Galilée, pourquoi restez-vous là à regarder vers le ciel ? Ce Jésus qui a été enlevé parmi vous vers le ciel viendra de la même manière." },
      { title: 'La Pentecôte', fruit: "La charité ardente et les sept dons du Saint-Esprit", ref: 'Actes 2, 1 à 4', text: "Quand arriva le jour de la Pentecôte, ils se trouvaient réunis tous ensemble. Ils virent apparaître des langues comme de feu qui se partageaient et il s'en posa une sur chacun d'eux. Ils furent tous remplis de l'Esprit Saint." },
      { title: "L'Assomption de la Vierge Marie", fruit: "La piété filiale envers Marie, Mère de Dieu", ref: 'Apocalypse 12, 1', text: "Un signe grandiose apparut dans le ciel : une femme enveloppée du soleil, la lune sous ses pieds, et sur sa tête une couronne de douze étoiles." },
      { title: 'Le Couronnement de Marie, Reine du Ciel', fruit: "La confiance et la dévotion à la Vierge Marie", ref: 'Apocalypse 12, 10', text: "J'entendis dans le ciel une voix forte qui disait : C'est maintenant le salut, la puissance et le règne de notre Dieu, et le pouvoir de son Christ." },
    ],
  },
];

// ── Génération ────────────────────────────────────────────────────────────────

async function generate(tts, filename, text) {
  const outPath = join(OUT_DIR, filename);
  process.stdout.write(`→ ${filename.padEnd(26)} `);
  try {
    // toFile() writes to a directory as audio.mp3, then we rename
    const tmpDir = join(OUT_DIR, `_tmp_${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const { audioFilePath } = await tts.toFile(tmpDir, text);
    renameSync(audioFilePath, outPath);
    try { rmdirSync(tmpDir); } catch {}
    const { size } = (await import('node:fs')).statSync(outPath);
    console.log(`✓  ${Math.round(size / 1024)} KB`);
  } catch (e) {
    console.log(`✗  ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 700));
}

async function main() {
  console.log('🎙️  Génération audio du Chapelet — Microsoft Edge TTS');
  console.log(`🗂️  Voix : ${VOICE}`);
  console.log(`📁 Sortie : ${OUT_DIR}\n`);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  // Prières fixes
  console.log('── Prières fixes ─────────────────────────────────────────');
  await generate(tts, 'credo.mp3', JE_CROIS_EN_DIEU);
  await generate(tts, 'notre-pere.mp3', NOTRE_PERE);
  await generate(tts, 'ave-maria.mp3', JE_VOUS_SALUE);
  await generate(tts, 'gloire.mp3', GLOIRE_AU_PERE);
  await generate(tts, 'fatima.mp3', O_MON_JESUS);
  await generate(tts, 'salve-regina.mp3', SALVE_REGINA);

  // Annonces des mystères
  console.log('\n── Mystères (20 fichiers) ────────────────────────────────');
  for (const set of MYSTERY_SETS) {
    for (let i = 0; i < set.mysteries.length; i++) {
      const m = set.mysteries[i];
      const text = `${ORDINALS[i]} mystère ${set.label} : ${m.title}. Fruit spirituel : ${m.fruit}. ${m.ref}. ${m.text}`;
      await generate(tts, `${set.key}-${i + 1}.mp3`, text);
    }
  }

  console.log('\n✅ Terminé !');
  console.log('   git add public/audio/chapelet && git commit -m "Add chapelet audio files" && git push');
}

main().catch(console.error);
