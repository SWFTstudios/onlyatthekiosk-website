/**
 * Original Kiosk merch concepts and photographic prompt templates.
 * Each numbered concept is shared across product variants so the generated
 * catalog reads as ten coherent capsules rather than eighty unrelated items.
 */

const TYPE_TO_COLLECTION = {
  chain: 'chains',
  bracelet: 'bracelets',
  hoodie: 'hoodies',
  tshirt: 't-shirts',
};

const VARIANT_DESCRIPTIONS = {
  gold: 'warm gold metallic finish',
  silver: 'cool silver metallic finish',
  black: 'deep matte black',
  white: 'clean off-white',
};

const DESIGN_CONCEPTS = {
  '001': {
    name: 'Signal From Elsewhere',
    phrase: 'SIGNAL FROM ELSEWHERE',
    artwork: 'a grainy orbital transmission diagram, concentric radio waves, one tiny lone figure and technical coordinate marks',
    jewelry: 'a rectangular dog-tag pendant engraved with concentric radio waves and a tiny black enamel signal dot',
  },
  '002': {
    name: 'The Observer',
    phrase: 'THE ONLY WITNESS IS YOURSELF',
    artwork: 'two mirrored human profiles forming a central keyhole silhouette, subtle optical-illusion linework and sparse editorial type',
    jewelry: 'a reversible oval pendant with mirrored profile cutouts forming a keyhole in the negative space',
  },
  '003': {
    name: 'Universal Citizen',
    phrase: 'UNIVERSAL CITIZEN',
    artwork: 'a worn passport composition with a spiral galaxy seal, imaginary entry stamps, star coordinates and restrained bureaucratic typography',
    jewelry: 'a coin pendant embossed like an imaginary interstellar passport seal with a spiral galaxy center',
  },
  '004': {
    name: 'As Within',
    phrase: 'AS WITHIN / SO WITHOUT',
    artwork: 'a wireframe hand containing a star field, orbit paths and five minimal alchemical geometry symbols',
    jewelry: 'an articulated hand-shaped talisman rendered in fine wireframe relief with five tiny geometric symbols',
  },
  '005': {
    name: 'Future Memory',
    phrase: 'THE FUTURE REMEMBERS YOU',
    artwork: 'a retro spaceflight archive image, blurred launch plume, halftone moon and condensed cinematic title treatment',
    jewelry: 'a slim rocket-fin pendant with a dark oxidized crater texture and a polished trailing edge',
  },
  '006': {
    name: 'No Fixed Reality',
    phrase: 'NOTHING REAL STAYS STILL',
    artwork: 'a warped horizon, liquid checker grid, small eclipsed planet and offset analog registration marks',
    jewelry: 'a fluid warped-ring pendant surrounding a small floating black enamel sphere',
  },
  '007': {
    name: 'Machine Dream',
    phrase: 'DREAMS FOR THE MACHINE',
    artwork: 'a friendly retro robot head assembled from obsolete electronics, exploded-view labels and a faint green terminal grid',
    jewelry: 'a compact robot-head charm built from geometric plates with two tiny dark enamel eyes',
  },
  '008': {
    name: 'Choose Your Orbit',
    phrase: 'CHOOSE YOUR ORBIT',
    artwork: 'a technical orbital map with three diverging paths, a tiny spacecraft and one path marked by a single signal dot',
    jewelry: 'three interlocking orbital rings around a small polished central bead',
  },
  '009': {
    name: 'Fear Is A Compass',
    phrase: 'FEAR IS A COMPASS',
    artwork: 'a vintage navigation chart, magnetic field lines, a surreal compass eye and distressed expedition annotations',
    jewelry: 'an eight-point compass pendant with an eye-shaped center and recessed dark enamel cardinal marks',
  },
  '010': {
    name: 'Good Story',
    phrase: 'BAD IDEAS / GOOD STORIES',
    artwork: 'bold soft-edged seventies lettering over a minimal road-at-night photograph, timestamp marks and a small KIOSK archive caption',
    jewelry: 'a chunky roadside-sign pendant with rounded corners and an engraved winding-road symbol',
  },
};

const PRODUCT_PRESENTATION = {
  chain: 'the complete necklace arranged naturally in a loose oval, pendant centered and fully visible',
  bracelet: 'the complete bracelet arranged in a natural open curve, clasp and sculptural details visible',
  hoodie: 'an oversized heavyweight hoodie photographed front and back together, small chest mark on the front and large centered back graphic fully visible',
  tshirt: 'an oversized heavyweight T-shirt photographed front and back together, small chest mark on the front and large centered back graphic fully visible',
};

const PHOTOGRAPHY_BASE = [
  'lifelike professional fashion photography captured as if on a Sony A7 III full-frame camera',
  'realistic lens falloff, natural micro-contrast, physically plausible shadows, fine material texture',
  'subtle analog grain, restrained editorial color grade, no CGI, no illustration, no mockup look',
  'square composition, no watermark, no unrelated brand logos',
].join(', ');

/**
 * Parse handle like "001-gold-chain" into components.
 */
function parseHandle(handle) {
  const match = handle.match(/^(\d{3})-(gold|silver|black|white)-(chain|bracelet|hoodie|tshirt)$/);
  if (!match) {
    throw new Error(`Invalid handle format: ${handle}`);
  }

  const [, number, variant, type] = match;
  return {
    number,
    variant,
    type,
    collection: TYPE_TO_COLLECTION[type],
  };
}

function getDesignConcept(number) {
  const concept = DESIGN_CONCEPTS[number];
  if (!concept) throw new Error(`Missing design concept for #${number}`);
  return concept;
}

function describeDesign(type, concept) {
  if (type === 'chain' || type === 'bracelet') {
    return concept.jewelry;
  }
  return `${concept.artwork}. The only prominent wording is exactly "${concept.phrase}", cleanly printed and correctly spelled`;
}

function buildProductPrompt({ number, variant, type }) {
  const concept = getDesignConcept(number);
  const variantDescription = VARIANT_DESCRIPTIONS[variant] || variant;
  const background = type === 'chain' || type === 'bracelet'
    ? 'charcoal museum-grade paper with a soft controlled rim light'
    : 'warm light-grey seamless paper with broad softbox lighting';

  return [
    `Studio catalog photograph for KIOSK capsule #${number}, "${concept.name}"`,
    `${variantDescription} ${type}; ${PRODUCT_PRESENTATION[type]}`,
    `Exact design: ${describeDesign(type, concept)}`,
    `shot on ${background}`,
    'Sony FE 55mm f/1.8 lens at f/8, ISO 100, 1/160s, neutral white balance',
    PHOTOGRAPHY_BASE,
    'crisp product edges, accurate construction, no person, no props obscuring the item',
  ].join('. ');
}

function buildLifestylePrompt({ number, variant, type }, scene) {
  const concept = getDesignConcept(number);
  const variantDescription = VARIANT_DESCRIPTIONS[variant] || variant;
  const worn = type === 'chain'
    ? 'necklace worn naturally over a plain heavyweight tee, pendant clearly visible'
    : type === 'bracelet'
      ? 'bracelet worn on a real wrist, complete design clearly visible'
      : `${type} worn oversized by an adult model, exact graphic and placement preserved`;
  const sceneDescription = scene === 1
    ? 'intimate close editorial crop at blue hour outside a late-night kiosk, practical fluorescent spill, candid expression, shallow depth of field'
    : 'wider spontaneous street scene after dark near concrete transit architecture, slight subject movement, sodium-vapor and storefront light, energetic but believable';
  const lens = scene === 1
    ? 'Sony FE 85mm f/1.8 at f/2.2, ISO 800, 1/250s'
    : 'Sony FE 35mm f/1.8 at f/2.8, ISO 1250, 1/320s';

  return [
    `Lifestyle campaign photograph for KIOSK capsule #${number}, "${concept.name}"`,
    `${variantDescription} ${worn}`,
    `Exact product design: ${describeDesign(type, concept)}`,
    sceneDescription,
    `${lens}, captured as a real RAW photograph with a Sony A7 III`,
    PHOTOGRAPHY_BASE,
    'natural anatomy and hands, visible skin pores, realistic textile folds, design unobstructed, no celebrity likeness',
  ].join('. ');
}

function buildPrompts(handle, title) {
  const parsed = parseHandle(handle);
  return {
    ...parsed,
    designName: getDesignConcept(parsed.number).name,
    productPrompt: buildProductPrompt(parsed),
    lifestylePrompt: buildLifestylePrompt(parsed, 1),
    lifestyle2Prompt: buildLifestylePrompt(parsed, 2),
  };
}

module.exports = {
  TYPE_TO_COLLECTION,
  VARIANT_DESCRIPTIONS,
  DESIGN_CONCEPTS,
  parseHandle,
  buildPrompts,
};
