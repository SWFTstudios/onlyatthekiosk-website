/**
 * Prompt templates for product and lifestyle placeholder images.
 * Tokens: {number}, {variant}, {title}, {type}, {collection}
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

const PRODUCT_PROMPTS = {
  chain: `Minimal editorial product photograph of a {variant} chain necklace, design #{number}. {variantDescription}. Centered on pure black seamless background, soft rim lighting, photorealistic, no logos, no text. Monochrome palette with accurate metallic accent. Studio packshot, square crop.`,
  bracelet: `Minimal editorial product photograph of a {variant} bracelet, design #{number}. {variantDescription}. Flat-lay on neutral grey surface, soft shadows, photorealistic, no logos, no text. Monochrome palette with accurate material accent. Studio packshot, square crop.`,
  hoodie: `Minimal editorial product photograph of a {variant} hoodie, design #{number}. {variantDescription}. Front-facing fold on hanger, dark grey background, photorealistic, no logos, no text. Monochrome streetwear aesthetic. Studio packshot, square crop.`,
  tshirt: `Minimal editorial product photograph of a {variant} t-shirt, design #{number}. {variantDescription}. Ghost mannequin flat presentation, light grey background, photorealistic, no logos, no text. Monochrome streetwear aesthetic. Studio packshot, square crop.`,
};

const LIFESTYLE_PROMPTS = {
  chain: `Editorial lifestyle photograph, {variant} chain necklace design #{number} worn on chest. Urban night setting, high contrast black and white with subtle {variant} metallic accent. Candid street style, photorealistic, no logos, no text. Moody atmosphere, square crop.`,
  bracelet: `Editorial lifestyle photograph, {variant} bracelet design #{number} on wrist during street movement. Skate or urban court setting, black and white with subtle {variant} accent. Dynamic crop, photorealistic, no logos, no text. Square crop.`,
  hoodie: `Editorial lifestyle photograph, person wearing {variant} hoodie design #{number}, hood up, in motion on gritty city street. High contrast monochrome, photorealistic, no logos, no text. Raw streetwear energy, square crop.`,
  tshirt: `Editorial lifestyle photograph, {variant} t-shirt design #{number} in layered streetwear context. Candid movement, urban environment, black and white palette, photorealistic, no logos, no text. Square crop.`,
};

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

/**
 * Fill prompt template tokens.
 */
function fillPrompt(template, { number, variant, type, title }) {
  const variantDescription = VARIANT_DESCRIPTIONS[variant] || variant;
  return template
    .replace(/\{number\}/g, number)
    .replace(/\{variant\}/g, variant)
    .replace(/\{title\}/g, title)
    .replace(/\{type\}/g, type)
    .replace(/\{variantDescription\}/g, variantDescription)
    .replace(/\{collection\}/g, TYPE_TO_COLLECTION[type] || type);
}

function buildPrompts(handle, title) {
  const parsed = parseHandle(handle);
  return {
    ...parsed,
    productPrompt: fillPrompt(PRODUCT_PROMPTS[parsed.type], { ...parsed, title }),
    lifestylePrompt: fillPrompt(LIFESTYLE_PROMPTS[parsed.type], { ...parsed, title }),
  };
}

module.exports = {
  TYPE_TO_COLLECTION,
  VARIANT_DESCRIPTIONS,
  parseHandle,
  buildPrompts,
};
