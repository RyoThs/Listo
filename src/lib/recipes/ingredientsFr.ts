// Traduction des ingrédients de TheMealDB (en anglais) vers le français.
// Liste faite à partir des 320 ingrédients les plus fréquents de la base (≈ 88 % des lignes de recettes).
// « * » au début = ingrédient des placards (sel, huile, épices…) : pas coché d'office.
// Un ingrédient absent garde son nom anglais.

const DICT: Record<string, string> = {
  'salt': '*Sel', 'kosher salt': '*Sel', 'sea salt': '*Sel', 'celery salt': '*Sel de céleri',
  'pepper': '*Poivre', 'black pepper': '*Poivre', 'ground black pepper': '*Poivre',
  'garlic': 'Ail', 'garlic clove': 'Ail', 'garlic cloves': 'Ail', 'minced garlic': 'Ail', 'garlic powder': '*Ail en poudre',
  'onion': 'Oignons', 'onions': 'Oignons', 'chopped onion': 'Oignons', 'red onions': 'Oignons rouges', 'red onion': 'Oignons rouges',
  'spring onions': 'Oignons nouveaux', 'scallions': 'Oignons nouveaux', 'shallots': 'Échalotes', 'challots': 'Échalotes', 'shallot': 'Échalotes',
  'butter': 'Beurre', 'unsalted butter': 'Beurre doux', 'salted butter': 'Beurre demi-sel', 'melted butter': 'Beurre',
  'olive oil': '*Huile d’olive', 'extra virgin olive oil': '*Huile d’olive', 'vegetable oil': '*Huile', 'oil': '*Huile',
  'sunflower oil': '*Huile de tournesol', 'rapeseed oil': '*Huile de colza', 'canola oil': '*Huile de colza', 'groundnut oil': '*Huile d’arachide',
  'ground nut oil': '*Huile d’arachide', 'peanut oil': '*Huile d’arachide', 'sesame seed oil': '*Huile de sésame', 'sesame oil': '*Huile de sésame',
  'sugar': '*Sucre', 'caster sugar': '*Sucre en poudre', 'granulated sugar': '*Sucre en poudre', 'golden caster sugar': '*Sucre en poudre',
  'brown sugar': '*Sucre roux', 'muscovado sugar': '*Sucre roux', 'dark brown soft sugar': '*Sucre roux', 'palm sugar': 'Sucre de palme',
  'icing sugar': 'Sucre glace', 'powdered sugar': 'Sucre glace',
  'milk': 'Lait', 'whole milk': 'Lait entier', 'condensed milk': 'Lait concentré sucré', 'coconut milk': 'Lait de coco', 'coconut cream': 'Crème de coco',
  'egg': 'Œufs', 'eggs': 'Œufs', 'egg yolks': 'Œufs', 'egg yolk': 'Œufs', 'egg white': 'Œufs', 'egg whites': 'Œufs',
  'flour': '*Farine', 'plain flour': '*Farine', 'all purpose flour': '*Farine', 'self-raising flour': 'Farine à gâteaux',
  'strong white bread flour': 'Farine à pain', 'corn flour': '*Maïzena', 'cornstarch': '*Maïzena', 'starch': '*Maïzena',
  'parsley': 'Persil', 'coriander': 'Coriandre', 'cilantro': 'Coriandre', 'coriander leaves': 'Coriandre', 'basil': 'Basilic', 'basil leaves': 'Basilic',
  'mint': 'Menthe', 'dill': 'Aneth', 'chives': 'Ciboulette', 'rosemary': 'Romarin', 'thyme': '*Thym', 'oregano': '*Origan', 'dried oregano': '*Origan',
  'bay leaf': '*Laurier', 'bay leaves': '*Laurier', 'marjoram': '*Marjolaine', 'dried mint': '*Menthe séchée', 'sage': 'Sauge',
  'potatoes': 'Pommes de terre', 'potato': 'Pommes de terre', 'new potatoes': 'Pommes de terre nouvelles', 'russet potato': 'Pommes de terre',
  'sweet potatoes': 'Patates douces', 'sweet potato': 'Patates douces',
  'carrots': 'Carottes', 'carrot': 'Carottes', 'celery': 'Céleri', 'celeriac': 'Céleri-rave', 'leek': 'Poireaux', 'leeks': 'Poireaux',
  'tomato': 'Tomates', 'tomatoes': 'Tomates', 'cherry tomatoes': 'Tomates cerises', 'plum tomatoes': 'Tomates', 'chopped tomatoes': 'Tomates concassées en conserve',
  'tinned tomatos': 'Tomates concassées en conserve', 'tinned tomatoes': 'Tomates concassées en conserve', 'tomato puree': 'Concentré de tomate',
  'tomato sauce': 'Sauce tomate', 'tomato ketchup': 'Ketchup',
  'lime': 'Citrons verts', 'limes': 'Citrons verts', 'lime juice': 'Citrons verts', 'lemon': 'Citrons', 'lemons': 'Citrons', 'lemon juice': 'Citrons', 'lemon zest': 'Citrons',
  'orange': 'Oranges', 'oranges': 'Oranges',
  'paprika': '*Paprika', 'smoked paprika': '*Paprika fumé', 'cumin': '*Cumin', 'ground cumin': '*Cumin', 'cumin seeds': '*Cumin',
  'cinnamon': '*Cannelle', 'ground cinnamon': '*Cannelle', 'cinnamon stick': '*Cannelle en bâton', 'nutmeg': '*Muscade', 'ground nutmeg': '*Muscade',
  'ginger': 'Gingembre', 'ground ginger': '*Gingembre en poudre', 'turmeric': '*Curcuma', 'cardamom': '*Cardamome', 'ground cardomom': '*Cardamome',
  'cloves': '*Clous de girofle', 'allspice': '*Piment de la Jamaïque', 'ground allspice': '*Piment de la Jamaïque', 'saffron': 'Safran',
  'cayenne pepper': '*Piment de Cayenne', 'chilli powder': '*Piment en poudre', 'chili powder': '*Piment en poudre', 'chilli flakes': '*Piment en flocons',
  'red pepper flakes': '*Piment en flocons', 'curry powder': '*Curry', 'garam masala': '*Garam masala', 'star anise': '*Badiane',
  'ground coriander': '*Coriandre moulue', 'harissa spice': 'Harissa', 'all-purpose seasoning': '*Assaisonnement',
  'red pepper': 'Poivrons rouges', 'green pepper': 'Poivrons verts', 'yellow pepper': 'Poivrons jaunes',
  'red chilli': 'Piments rouges', 'green chilli': 'Piments verts', 'chilli': 'Piments', 'scotch bonnet': 'Piments antillais', 'jalapeno': 'Piments jalapeños',
  'birds-eye chillies': 'Piments oiseau',
  'soy sauce': '*Sauce soja', 'fish sauce': 'Sauce poisson (nuoc-mâm)', 'oyster sauce': 'Sauce d’huître', 'worcestershire sauce': '*Sauce Worcestershire',
  'hotsauce': 'Sauce piquante', 'sweet chilli sauce': 'Sauce chili douce', 'thai red curry paste': 'Pâte de curry rouge', 'tamarind paste': 'Pâte de tamarin',
  'baking powder': '*Levure chimique', 'bicarbonate of soda': '*Bicarbonate', 'yeast': 'Levure de boulanger', 'instant yeast': 'Levure de boulanger',
  'vanilla extract': '*Extrait de vanille', 'vanilla': '*Extrait de vanille', 'vanilla pod': 'Gousse de vanille', 'almond extract': '*Extrait d’amande',
  'chicken stock': 'Bouillon de volaille', 'chicken stock cube': 'Bouillon de volaille', 'beef stock': 'Bouillon de bœuf', 'vegetable stock': 'Bouillon de légumes',
  'vegetable stock cube': 'Bouillon de légumes', 'fish stock': 'Fumet de poisson',
  'rice': 'Riz', 'basmati rice': 'Riz basmati', 'jasmine rice': 'Riz jasmin', 'paella rice': 'Riz à paella', 'rice noodles': 'Nouilles de riz',
  'spaghetti': 'Spaghettis', 'macaroni': 'Macaronis',
  'beef': 'Bœuf', 'ground beef': 'Viande hachée', 'minced beef': 'Viande hachée', 'beef brisket': 'Poitrine de bœuf', 'sirloin steak': 'Steaks',
  'chicken': 'Poulet', 'chicken breast': 'Blancs de poulet', 'chicken breasts': 'Blancs de poulet', 'chicken thighs': 'Hauts de cuisse de poulet', 'chicken legs': 'Cuisses de poulet',
  'pork': 'Porc', 'ground pork': 'Porc haché', 'minced pork': 'Porc haché', 'pork chops': 'Côtes de porc',
  'lamb': 'Agneau', 'lamb mince': 'Agneau haché', 'lamb leg': 'Gigot d’agneau',
  'bacon': 'Lardons', 'chorizo': 'Chorizo', 'ham': 'Jambon', 'sausages': 'Saucisses', 'lard': 'Saindoux', 'suet': 'Graisse de bœuf',
  'prawns': 'Crevettes', 'king prawns': 'Crevettes', 'raw king prawns': 'Crevettes', 'shrimp': 'Crevettes', 'squid': 'Calamars',
  'salmon': 'Saumon', 'white fish': 'Poisson blanc', 'smoked haddock': 'Haddock fumé', 'salt cod': 'Morue salée',
  'double cream': 'Crème fraîche épaisse', 'heavy cream': 'Crème fraîche liquide', 'whipping cream': 'Crème liquide entière', 'single cream': 'Crème liquide',
  'cream': 'Crème fraîche', 'sour cream': 'Crème aigre', 'creme fraiche': 'Crème fraîche', 'greek yogurt': 'Yaourt grec', 'yogurt': 'Yaourt nature',
  'cream cheese': 'Fromage frais (type Philadelphia)', 'mascarpone': 'Mascarpone', 'parmesan': 'Parmesan', 'parmesan cheese': 'Parmesan',
  'mozzarella': 'Mozzarella', 'mozzarella balls': 'Mozzarella', 'feta': 'Feta', 'cheddar cheese': 'Cheddar', 'cheese': 'Fromage râpé', 'gruyère': 'Gruyère',
  'bread': 'Pain', 'baguette': 'Baguette', 'pita bread': 'Pains pita', 'breadcrumbs': 'Chapelure',
  'puff pastry': 'Pâte feuilletée', 'shortcrust pastry': 'Pâte brisée', 'filo pastry': 'Feuilles de brick',
  'almonds': 'Amandes', 'ground almonds': 'Poudre d’amande', 'walnuts': 'Noix', 'peanuts': 'Cacahuètes', 'roasted peanut': 'Cacahuètes',
  'pine nuts': 'Pignons de pin', 'pistachio': 'Pistaches', 'desiccated coconut': 'Noix de coco râpée', 'coconut': 'Noix de coco', 'peanut butter': 'Beurre de cacahuète',
  'sesame seed': 'Graines de sésame', 'raisins': 'Raisins secs', 'dried apricots': 'Abricots secs', 'prunes': 'Pruneaux', 'dried fruit': 'Fruits secs',
  'honey': 'Miel', 'clear honey': 'Miel', 'golden syrup': 'Sirop de sucre', 'maple syrup': 'Sirop d’érable', 'molasses': 'Mélasse', 'black treacle': 'Mélasse',
  'jam': 'Confiture', 'dulce de leche': 'Confiture de lait', 'dark chocolate': 'Chocolat noir', 'chocolate chips': 'Pépites de chocolat', 'cocoa powder': 'Cacao en poudre',
  'custard': 'Crème anglaise', 'digestive biscuits': 'Biscuits sablés',
  'mayonnaise': 'Mayonnaise', 'mustard': 'Moutarde', 'dijon mustard': 'Moutarde de Dijon', 'english mustard': 'Moutarde forte',
  'vinegar': '*Vinaigre', 'white vinegar': '*Vinaigre blanc', 'red wine vinegar': '*Vinaigre de vin', 'white wine vinegar': '*Vinaigre de vin blanc',
  'rice vinegar': 'Vinaigre de riz', 'balsamic vinegar': '*Vinaigre balsamique', 'apple cider vinegar': '*Vinaigre de cidre', 'sherry vinegar': '*Vinaigre de xérès',
  'white wine': 'Vin blanc', 'dry white wine': 'Vin blanc sec', 'red wine': 'Vin rouge', 'dry sherry': 'Xérès', 'brandy': 'Cognac',
  'mushrooms': 'Champignons', 'cucumber': 'Concombre', 'lettuce': 'Salade', 'rocket': 'Roquette', 'spinach': 'Épinards', 'kale': 'Chou kale',
  'cabbage': 'Chou', 'white cabbage': 'Chou blanc', 'red cabbage': 'Chou rouge', 'sauerkraut': 'Choucroute', 'broccoli': 'Brocoli',
  'aubergine': 'Aubergines', 'egg plants': 'Aubergines', 'courgettes': 'Courgettes', 'green beans': 'Haricots verts', 'broad beans': 'Fèves',
  'peas': 'Petits pois', 'sweetcorn': 'Maïs', 'bean sprouts': 'Pousses de soja', 'avocado': 'Avocats', 'pumpkin': 'Potiron', 'butternut squash': 'Courge butternut',
  'squash': 'Courge', 'beetroot': 'Betteraves', 'fennel': 'Fenouil', 'swede': 'Rutabaga', 'lemongrass': 'Citronnelle', 'lemongrass stalks': 'Citronnelle', 'galangal': 'Galanga',
  'chickpeas': 'Pois chiches', 'kidney beans': 'Haricots rouges', 'black beans': 'Haricots noirs', 'cannellini beans': 'Haricots blancs', 'butter beans': 'Haricots blancs',
  'dried white beans': 'Haricots blancs secs', 'black olives': 'Olives noires', 'green olives': 'Olives vertes',
  'banana': 'Bananes', 'apples': 'Pommes', 'apple': 'Pommes', 'mango': 'Mangue', 'raspberries': 'Framboises', 'strawberries': 'Fraises', 'blackberries': 'Mûres',
  'orange blossom water': 'Eau de fleur d’oranger', 'rose water': 'Eau de rose', 'shortening': 'Graisse végétale',
};

/** Ingrédients ignorés : on ne les achète pas. */
const SKIP = new Set(['water', 'warm water', 'cold water', 'boiling water', 'hot water', 'ice', 'ice cubes']);

export interface Translated { name: string; pantry: boolean }

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** null = ingrédient à ignorer (l'eau). */
export function translateIngredient(english: string): Translated | null {
  const key = english.replace(/\s+/g, ' ').trim().toLowerCase();
  if (!key || SKIP.has(key)) return null;
  const fr = DICT[key] ?? (key.endsWith('s') ? DICT[key.slice(0, -1)] : undefined);
  if (!fr) return { name: capitalize(key), pantry: false };
  return fr.startsWith('*') ? { name: fr.slice(1), pantry: true } : { name: fr, pantry: false };
}

/** Pour chercher en français : « poulet » → « chicken » (le premier mot anglais qui donne ce nom). */
export function englishFor(french: string): string | undefined {
  const target = french.trim().toLowerCase();
  if (!target) return undefined;
  for (const [en, fr] of Object.entries(DICT)) {
    const name = fr.replace(/^\*/, '').toLowerCase();
    if (name === target || name === `${target}s` || name === `${target}x`) return en;
  }
  return undefined;
}
