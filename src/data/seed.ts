import type { Artist, Artwork, Category, Material, Order, Province, Review, Story, Technique, User } from './types';

/** Bump when seed content changes so existing installs pick it up. */
export const SEED_VERSION = 1;

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 9, 1);

export const provinces: Province[] = [
  { slug: 'chimbu', name: 'Chimbu (Simbu)', code: 'CPK', region: 'Highlands', capital: 'Kundiawa', crafts: ['Bilums', 'Bark belts'], blurb: 'Steep limestone valleys below Mount Wilhelm, known for bold bilum colourwork.', pattern: 'bilum', },
  { slug: 'eastern-highlands', name: 'Eastern Highlands', code: 'EHP', region: 'Highlands', capital: 'Goroka', crafts: ['Bilums', 'Mud masks', 'Bilas'], blurb: 'Home of the Goroka Show and some of the country\'s finest looped bilums.', pattern: 'bilum', },
  { slug: 'enga', name: 'Enga', code: 'EPW', region: 'Highlands', capital: 'Wabag', crafts: ['Wigs', 'Woven armbands'], blurb: 'High valleys with strong traditions of ceremonial dress and woven ornaments.', pattern: 'basket', },
  { slug: 'hela', name: 'Hela', code: 'HLA', region: 'Highlands', capital: 'Tari', crafts: ['Ceremonial wigs', 'Bilums'], blurb: 'Land of the Huli, famous for elaborate human-hair ceremonial wigs.', pattern: 'bilum', },
  { slug: 'jiwaka', name: 'Jiwaka', code: 'JWK', region: 'Highlands', capital: 'Banz', crafts: ['Bilums', 'Shell valuables'], blurb: 'Fertile Wahgi valley farmland with rich bilum and bilas traditions.', pattern: 'bilum', },
  { slug: 'southern-highlands', name: 'Southern Highlands', code: 'SHM', region: 'Highlands', capital: 'Mendi', crafts: ['Bilums', 'Stone tools'], blurb: 'Rugged highland country with long trade links for shell and salt.', pattern: 'basket', },
  { slug: 'western-highlands', name: 'Western Highlands', code: 'WHM', region: 'Highlands', capital: 'Mount Hagen', crafts: ['Paintings', 'Bilums', 'Kina shell'], blurb: 'Host of the Mount Hagen Cultural Show and a centre of contemporary painting.', pattern: 'paint', },
  { slug: 'east-sepik', name: 'East Sepik', code: 'ESW', region: 'Momase', capital: 'Wewak', crafts: ['Storyboards', 'Masks', 'Pottery', 'Garamut'], blurb: 'The Sepik River is one of the great carving cultures of the Pacific.', pattern: 'carve', },
  { slug: 'madang', name: 'Madang', code: 'MPM', region: 'Momase', capital: 'Madang', crafts: ['Pottery', 'Carvings'], blurb: 'Coastal province with old pottery-trading villages along the Rai Coast.', pattern: 'pottery', },
  { slug: 'morobe', name: 'Morobe', code: 'MPL', region: 'Momase', capital: 'Lae', crafts: ['Tapa', 'Bilums', 'Carved bowls'], blurb: 'From the Huon Gulf to the highlands fringe, with Tami Island bowls and tapa.', pattern: 'tapa', },
  { slug: 'west-sepik', name: 'West Sepik (Sandaun)', code: 'SAN', region: 'Momase', capital: 'Vanimo', crafts: ['Carvings', 'Bark paintings'], blurb: 'Border province with carving and bark-painting traditions.', pattern: 'carve', },
  { slug: 'central', name: 'Central', code: 'CPM', region: 'Southern', capital: 'Port Moresby (seat)', crafts: ['Pottery', 'Shell jewellery'], blurb: 'Motu potters once traded clay pots along the coast on lakatoi canoes.', pattern: 'pottery', },
  { slug: 'gulf', name: 'Gulf', code: 'GPK', region: 'Southern', capital: 'Kerema', crafts: ['Masks', 'Gope boards'], blurb: 'Delta country known for painted gope boards and barkcloth masks.', pattern: 'mask', },
  { slug: 'milne-bay', name: 'Milne Bay', code: 'MBA', region: 'Southern', capital: 'Alotau', crafts: ['Ebony carvings', 'Kula valuables', 'Baskets'], blurb: 'Islands of the kula ring, including the Trobriands and their ebony carvers.', pattern: 'carve', },
  { slug: 'oro', name: 'Oro (Northern)', code: 'NPP', region: 'Southern', capital: 'Popondetta', crafts: ['Tapa cloth'], blurb: 'Barkcloth painted with designs of mountains, rivers and clan emblems.', pattern: 'tapa', },
  { slug: 'western', name: 'Western (Fly)', code: 'WPD', region: 'Southern', capital: 'Daru', crafts: ['Carvings', 'Drums'], blurb: 'The vast Fly River basin, with drum and carving traditions.', pattern: 'carve', },
  { slug: 'ncd', name: 'National Capital District', code: 'NCD', region: 'Southern', capital: 'Port Moresby', crafts: ['Contemporary art', 'Markets'], blurb: 'Port Moresby\'s craft markets bring makers from every province together.', pattern: 'paint', },
  { slug: 'east-new-britain', name: 'East New Britain', code: 'EBR', region: 'Islands', capital: 'Kokopo', crafts: ['Masks', 'Shell money'], blurb: 'Tolai and Baining country, host of the National Mask Festival.', pattern: 'mask', },
  { slug: 'manus', name: 'Manus', code: 'MRL', region: 'Islands', capital: 'Lorengau', crafts: ['Shell & bead work', 'Carved bowls'], blurb: 'Island province known for fine shell and bead ornaments.', pattern: 'shell', },
  { slug: 'new-ireland', name: 'New Ireland', code: 'NIK', region: 'Islands', capital: 'Kavieng', crafts: ['Malagan carvings', 'Shell money'], blurb: 'Birthplace of malagan, intricate carvings made for memorial ceremonies.', pattern: 'carve', },
  { slug: 'west-new-britain', name: 'West New Britain', code: 'WBK', region: 'Islands', capital: 'Kimbe', crafts: ['Masks', 'Baskets'], blurb: 'Volcanic coastline with mask and basketry traditions.', pattern: 'basket', },
  { slug: 'bougainville', name: 'Autonomous Region of Bougainville', code: 'ARB', region: 'Islands', capital: 'Buka', crafts: ['Buka baskets', 'Carvings'], blurb: 'Weavers here make some of the finest coiled baskets in the Pacific.', pattern: 'basket', },
];

export const categories: Category[] = [
  { slug: 'carvings', name: 'Wood carvings', pattern: 'carve' },
  { slug: 'bilums', name: 'Bilums', pattern: 'bilum' },
  { slug: 'tapa', name: 'Tapa cloth', pattern: 'tapa' },
  { slug: 'baskets', name: 'Baskets & weaving', pattern: 'basket' },
  { slug: 'paintings', name: 'Paintings', pattern: 'paint' },
  { slug: 'masks', name: 'Masks', pattern: 'mask' },
  { slug: 'pottery', name: 'Pottery', pattern: 'pottery' },
  { slug: 'jewellery', name: 'Shell & bead jewellery', pattern: 'shell' },
  { slug: 'instruments', name: 'Kundu & garamut', pattern: 'carve', variant: 1 },
  { slug: 'sculpture', name: 'Sculpture', pattern: 'carve', variant: 2 },
];

export const materials: Material[] = [
  { slug: 'kwila', name: 'Kwila (ironwood)', source: 'Dense lowland hardwood, deep red-brown, very durable.', care: 'Dust with a dry cloth. Oil lightly once a year with coconut or linseed oil.', exportNote: 'Finished carvings are fine to export; raw timber is restricted.', sustainable: true, pattern: 'carve' },
  { slug: 'softwood', name: 'Carving softwood', source: 'Light, even-grained river timbers used for storyboards and masks.', care: 'Keep out of direct sun and damp. Dust gently.', sustainable: true, pattern: 'carve' },
  { slug: 'ebony', name: 'Ebony', source: 'Black heartwood prized by Trobriand carvers; often paired with lighter sapwood.', care: 'Polish with beeswax. Avoid rapid humidity changes.', sustainable: false, pattern: 'carve' },
  { slug: 'bark-fibre', name: 'Bark fibre string', source: 'Inner bark of forest trees, rolled into string on the thigh and dyed with plant pigments.', care: 'Hand wash in cold water, dry in shade.', sustainable: true, pattern: 'bilum' },
  { slug: 'wool', name: 'Wool & acrylic yarn', source: 'Introduced yarns now used for colourful modern bilums.', care: 'Cold hand wash, dry flat.', sustainable: true, pattern: 'bilum' },
  { slug: 'mulberry-bark', name: 'Paper mulberry bark', source: 'Inner bark beaten into barkcloth (tapa).', care: 'Frame behind glass or roll loosely. Keep dry.', sustainable: true, pattern: 'tapa' },
  { slug: 'pandanus', name: 'Pandanus', source: 'Leaves are dried, stripped and softened for mats and baskets.', care: 'Keep dry; brush off dust.', sustainable: true, pattern: 'basket' },
  { slug: 'bush-vine', name: 'Bush vine', source: 'Split forest vines, coiled tight for Buka baskets.', care: 'Wipe with a damp cloth. Avoid soaking.', sustainable: true, pattern: 'basket' },
  { slug: 'shell', name: 'Cowrie, kina & nassa shell', source: 'Gathered on reefs and shores; traditional currency and adornment.', care: 'Wipe with a soft cloth. Store away from perfume.', exportNote: 'Some protected shells need a permit to export.', sustainable: true, pattern: 'shell' },
  { slug: 'clay', name: 'River clay', source: 'Coiled and fired in open bonfires, often incised with clan designs.', care: 'Decorative only; not for cooking water. Handle with two hands.', sustainable: true, pattern: 'pottery' },
  { slug: 'natural-pigment', name: 'Natural pigments', source: 'Ochres, lime, charcoal and plant dyes.', care: 'Do not wet painted surfaces.', sustainable: true, pattern: 'paint' },
  { slug: 'acrylic', name: 'Acrylic on canvas', source: 'Contemporary paintings by trained and self-taught artists.', care: 'Keep out of direct sunlight.', sustainable: true, pattern: 'paint' },
];

export const techniques: Technique[] = [
  { slug: 'bilum-looping', name: 'Bilum looping', where: 'Highlands and much of mainland PNG', summary: 'A bilum is made by looping a single continuous string around itself, with no knots. A large bag can take months.', pattern: 'bilum',
    steps: [
      { title: 'Rolling the string', body: 'Bark fibre is soaked, scraped and rolled against the thigh into two-ply string. Many makers now use wool or acrylic yarn.' },
      { title: 'Looping', body: 'Using a flat needle, the maker loops the string around a gauge stick, row by row, building the fabric outward.' },
      { title: 'Patterning', body: 'Colour changes create diamonds, zigzags and stripes. Some designs are linked to a family or place.' },
      { title: 'Strap', body: 'A long strap is looped last. The bilum is carried from the forehead, leaving the hands free.' },
    ], tools: ['Gauge stick', 'Flat needle', 'Knife'] },
  { slug: 'tapa-beating', name: 'Tapa beating', where: 'Oro, Morobe and coastal areas', summary: 'Inner bark is beaten into soft barkcloth, then painted with designs that carry clan and landscape meanings.', pattern: 'tapa',
    steps: [
      { title: 'Stripping', body: 'The inner bark of the paper mulberry is stripped and soaked in the river.' },
      { title: 'Beating', body: 'The bark is beaten on a log with a grooved mallet until it spreads into a thin sheet.' },
      { title: 'Drying', body: 'Sheets dry in the sun and may be joined to make larger cloths.' },
      { title: 'Painting', body: 'Designs are painted freehand with natural pigments using fibre or stick brushes.' },
    ], tools: ['Grooved mallet', 'Beating log', 'Fibre brushes'] },
  { slug: 'relief-carving', name: 'Relief storyboard carving', where: 'Keram River, East Sepik', summary: 'Scenes from myth and village life are carved in relief on a flat board and coloured with ochre and lime.', pattern: 'carve',
    steps: [
      { title: 'Choosing the plank', body: 'A single plank is split and smoothed. The story is sketched in charcoal.' },
      { title: 'Cutting back', body: 'The background is cut away with chisels so figures stand out in relief.' },
      { title: 'Detail', body: 'Faces, crocodile scales and patterns are refined with smaller blades.' },
      { title: 'Colouring', body: 'Ochre, lime and charcoal fill the surfaces to make the story readable.' },
    ], tools: ['Adze', 'Chisels', 'Knife', 'Ochre and lime'] },
  { slug: 'coil-weaving', name: 'Coil basket weaving', where: 'Buka and Bougainville', summary: 'Bundles of vine are coiled and stitched so tightly that the finest baskets can hold water.', pattern: 'basket',
    steps: [
      { title: 'Gathering', body: 'Vines are collected, split and dried.' },
      { title: 'Coiling', body: 'A core bundle is wound in a spiral and stitched to the row below.' },
      { title: 'Patterning', body: 'Darker dyed strands form geometric patterns around the body.' },
      { title: 'Finishing', body: 'Lids are made to fit exactly; a good basket closes with a soft click.' },
    ], tools: ['Bone or metal awl', 'Knife'] },
  { slug: 'ebony-carving', name: 'Trobriand ebony carving', where: 'Trobriand Islands, Milne Bay', summary: 'Carvers work black ebony against pale sapwood, polishing figures, bowls and walking sticks to a deep shine.', pattern: 'carve',
    steps: [
      { title: 'Rough out', body: 'The form is cut with an adze, using the contrast of heartwood and sapwood.' },
      { title: 'Shaping', body: 'Knives and rasps refine the figure.' },
      { title: 'Inlay', body: 'Some pieces are inlaid with nautilus shell or lime.' },
      { title: 'Polish', body: 'Sanding and polishing bring up the dark lustre.' },
    ], tools: ['Adze', 'Knives', 'Rasp', 'Sandpaper or shark skin'] },
  { slug: 'clay-coiling', name: 'Clay coiling', where: 'Aibom (East Sepik), Madang and Central coasts', summary: 'Pots are built from clay coils, incised with designs, and fired in open bonfires.', pattern: 'pottery',
    steps: [
      { title: 'Preparing clay', body: 'River clay is cleaned and tempered with sand.' },
      { title: 'Coiling', body: 'Coils are laid and smoothed with a paddle and anvil stone.' },
      { title: 'Incising', body: 'Faces and patterns are cut while the clay is leather hard.' },
      { title: 'Firing', body: 'Pots are fired in an open fire for a few hours.' },
    ], tools: ['Paddle', 'Anvil stone', 'Bamboo knife'] },
];

export const artists: Artist[] = [
  { id: 'a1', name: 'Joseph Kaman', province: 'east-sepik', village: 'Kambot village', crafts: ['Storyboards', 'Masks'], yearsPractising: 28, verification: 'verified', pattern: 'mask', joinedAt: t0 - 300 * DAY,
    bio: 'Joseph carves storyboards on the Keram River. Each board tells a story he heard from his grandfather, who taught him to read the grain before cutting it.',
    lineage: 'Third-generation carver. Learned from his grandfather and uncles in the haus tambaran.' },
  { id: 'a2', name: 'Mary Tumu', province: 'eastern-highlands', village: 'Asaro, near Goroka', crafts: ['Bilums'], yearsPractising: 22, verification: 'verified', pattern: 'bilum', joinedAt: t0 - 260 * DAY,
    bio: 'Mary loops bilums in bark fibre and bright wool. She leads a women\'s group of fourteen makers who sell together at the Goroka market.',
    lineage: 'Taught by her mother from the age of eight.' },
  { id: 'a3', name: 'Ruth Sevaru', province: 'oro', village: 'Tufi coast', crafts: ['Tapa cloth'], yearsPractising: 35, verification: 'verified', pattern: 'tapa', joinedAt: t0 - 240 * DAY,
    bio: 'Ruth beats and paints tapa cloth with designs passed down through the women of her family: rivers, mountains and the tracks of the cassowary.',
    lineage: 'Inherited the right to paint her family designs from her grandmother.' },
  { id: 'a4', name: 'Peni Tovue', province: 'east-new-britain', village: 'Rabaul district', crafts: ['Masks'], yearsPractising: 18, verification: 'verified', pattern: 'mask', variant: 1, joinedAt: t0 - 200 * DAY,
    bio: 'Peni makes barkcloth and cane masks and performs with his group at the National Mask Festival in Kokopo every July.',
    lineage: 'Learned from the elders of his village dance group.' },
  { id: 'a5', name: 'Lucy Siune', province: 'bougainville', village: 'Buka Island', crafts: ['Baskets'], yearsPractising: 26, verification: 'verified', pattern: 'basket', joinedAt: t0 - 180 * DAY,
    bio: 'Lucy\'s coiled baskets are so tight they hold water. A lidded basket takes her about three weeks.',
    lineage: 'Part of a long line of Buka weavers on her mother\'s side.' },
  { id: 'a6', name: 'David Kauna', province: 'milne-bay', village: 'Kiriwina, Trobriand Islands', crafts: ['Ebony carvings'], yearsPractising: 20, verification: 'verified', pattern: 'carve', variant: 2, joinedAt: t0 - 150 * DAY,
    bio: 'David carves ebony figures, bowls and walking sticks. He is known for fine nautilus-shell inlay.',
    lineage: 'Trained by his father, a carver for the Kiriwina craft cooperative.' },
  { id: 'a7', name: 'Grace Wapi', province: 'western-highlands', village: 'Mount Hagen', crafts: ['Paintings'], yearsPractising: 9, verification: 'none', pattern: 'paint', joinedAt: t0 - 60 * DAY,
    bio: 'Grace paints highland singsing scenes in acrylic, drawing on face-paint designs and the bilas of the Hagen show.',
    lineage: 'Self-taught; mentored at a Port Moresby studio.' },
  { id: 'a8', name: 'Samuel Yambi', province: 'east-sepik', village: 'Aibom, Chambri Lakes', crafts: ['Pottery'], yearsPractising: 15, verification: 'verified', pattern: 'pottery', joinedAt: t0 - 120 * DAY,
    bio: 'Samuel builds coiled clay pots and fire-hearths incised with ancestral faces, a tradition of the Chambri Lakes.',
    lineage: 'Learned from the potters of Aibom village.' },
  { id: 'a9', name: 'Rose Kila', province: 'manus', village: 'Lorengau', crafts: ['Shell & bead jewellery'], yearsPractising: 12, verification: 'verified', pattern: 'shell', joinedAt: t0 - 90 * DAY,
    bio: 'Rose strings shell and glass-bead necklaces, armbands and headbands in Manus designs.',
    lineage: 'Taught by her aunties for bride-price ornaments.' },
];

type SeedArt = Omit<Artwork, 'images' | 'status' | 'createdAt' | 'certificateSerial' | 'views'> & { views?: number };
const raw: SeedArt[] = [
  { id: 'w1', title: 'Crocodile spirit storyboard', artistId: 'a1', category: 'carvings', province: 'east-sepik', price: 1250, pattern: 'carve', featured: true, materials: ['softwood', 'natural-pigment'], techniques: ['relief-carving'], dimensions: '92 × 34 × 4 cm', weightKg: 6.5, exportPermit: true, oneOfAKind: true,
    story: 'Carved in relief on a single plank, the board tells how the crocodile ancestor shaped the Keram River with its tail. Villages along the river trace their clans back to that journey.',
    significance: 'The crocodile is a powerful ancestral being across the Sepik. Young men\'s initiation once included scarification in the pattern of crocodile scales.' },
  { id: 'w2', title: 'Highlands wool bilum, large', artistId: 'a2', category: 'bilums', province: 'eastern-highlands', price: 180, pattern: 'bilum', featured: true, materials: ['wool'], techniques: ['bilum-looping'], dimensions: '45 × 40 cm, 1.2 m strap', weightKg: 0.4, exportPermit: false, oneOfAKind: true,
    story: 'Mary looped this bag over nine weeks in red, gold and black, the colours of the national flag.', significance: 'Bilums carry food, babies and belongings, and are given as gifts at weddings and funerals. The word "bilum" also means womb.' },
  { id: 'w3', title: 'Barkcloth: mountain and river', artistId: 'a3', category: 'tapa', province: 'oro', price: 520, pattern: 'tapa', featured: true, materials: ['mulberry-bark', 'natural-pigment'], techniques: ['tapa-beating'], dimensions: '120 × 80 cm', weightKg: 0.6, exportPermit: false, oneOfAKind: true,
    story: 'The repeating rings are mountains seen from the sea; the lines between them are rivers. Ruth painted it freehand in one afternoon.', significance: 'Designs are owned by families and passed from mother to daughter.' },
  { id: 'w4', title: 'Baining fire-dance mask (small)', artistId: 'a4', category: 'masks', province: 'east-new-britain', price: 640, pattern: 'mask', variant: 1, featured: true, materials: ['mulberry-bark', 'natural-pigment'], techniques: [], dimensions: '58 × 30 cm', weightKg: 0.8, exportPermit: true, oneOfAKind: true,
    story: 'A smaller display version of a fire-dance mask, made with barkcloth stretched over a cane frame and painted with charcoal and red ochre.', significance: 'Baining night fire dances mark harvests, births and remembrance of the dead.' },
  { id: 'w5', title: 'Buka coil basket with lid', artistId: 'a5', category: 'baskets', province: 'bougainville', price: 390, pattern: 'basket', featured: true, materials: ['bush-vine'], techniques: ['coil-weaving'], dimensions: '22 × 22 cm', weightKg: 0.5, exportPermit: false, oneOfAKind: true,
    story: 'Woven over three weeks. The darker band is dyed vine forming a frigate-bird pattern.', significance: 'Fine baskets are prized gifts and a source of income for many Bougainville families.' },
  { id: 'w6', title: 'Ebony figure with shell inlay', artistId: 'a6', category: 'sculpture', province: 'milne-bay', price: 860, pattern: 'carve', variant: 2, featured: true, materials: ['ebony', 'shell'], techniques: ['ebony-carving'], dimensions: '48 × 10 × 10 cm', weightKg: 1.4, exportPermit: false, oneOfAKind: true,
    story: 'A standing figure with nautilus-shell eyes, carved from one piece of ebony with a pale sapwood base.', significance: 'Trobriand carving grew alongside the kula exchange, where finely made objects carry prestige.' },
  { id: 'w7', title: 'Singsing at Hagen', artistId: 'a7', category: 'paintings', province: 'western-highlands', price: 450, pattern: 'paint', featured: true, materials: ['acrylic'], techniques: [], dimensions: '90 × 60 cm canvas', weightKg: 1.2, exportPermit: false, oneOfAKind: true,
    story: 'Dancers in bird-of-paradise plumes, painted after the Mount Hagen show.', significance: 'Face paint and bilas (decoration) identify clans and show the strength of a group.' },
  { id: 'w8', title: 'Aibom fire-hearth pot', artistId: 'a8', category: 'pottery', province: 'east-sepik', price: 320, pattern: 'pottery', materials: ['clay'], techniques: ['clay-coiling'], dimensions: '30 × 30 cm', weightKg: 3.2, exportPermit: true, oneOfAKind: true,
    story: 'Coiled and incised with an ancestral face, then fired in an open bonfire.', significance: 'Aibom pots were traded along the Sepik for sago and fish.' },
  { id: 'w9', title: 'Manus shell and bead headband', artistId: 'a9', category: 'jewellery', province: 'manus', price: 140, pattern: 'shell', materials: ['shell'], techniques: [], dimensions: '56 cm circumference', weightKg: 0.1, exportPermit: false, oneOfAKind: false,
    story: 'Glass beads and nassa shell in a Manus diamond pattern.', significance: 'Shell ornaments are part of bride price and ceremonial dress.' },
  { id: 'w10', title: 'Garamut slit drum (miniature)', artistId: 'a1', category: 'instruments', province: 'east-sepik', price: 980, pattern: 'carve', variant: 1, materials: ['kwila'], techniques: ['relief-carving'], dimensions: '60 × 18 cm', weightKg: 5, exportPermit: true, oneOfAKind: true,
    story: 'A playable miniature garamut, hollowed from kwila with a carved crocodile handle.', significance: 'Garamut drums send messages between villages and call people to gather.' },
  { id: 'w11', title: 'Bark-fibre bilum, natural dyes', artistId: 'a2', category: 'bilums', province: 'eastern-highlands', price: 260, pattern: 'bilum', variant: 1, materials: ['bark-fibre'], techniques: ['bilum-looping'], dimensions: '38 × 34 cm', weightKg: 0.3, exportPermit: false, oneOfAKind: true,
    story: 'Rolled bark-fibre string dyed with forest pigments. Slower to make than wool, and it softens beautifully with use.', significance: 'Fibre bilums are the older form, made long before trade wool arrived.' },
  { id: 'w12', title: 'Kundu hand drum', artistId: 'a1', category: 'instruments', province: 'east-sepik', price: 420, pattern: 'carve', variant: 1, materials: ['softwood'], techniques: ['relief-carving'], dimensions: '55 cm', weightKg: 1.6, exportPermit: false, oneOfAKind: true,
    story: 'An hourglass drum with a lizard-skin head, tuned with beeswax pellets.', significance: 'The kundu keeps rhythm at every singsing.' },
  { id: 'w13', title: 'Tapa: cassowary tracks', artistId: 'a3', category: 'tapa', province: 'oro', price: 380, pattern: 'tapa', variant: 1, materials: ['mulberry-bark', 'natural-pigment'], techniques: ['tapa-beating'], dimensions: '90 × 60 cm', weightKg: 0.4, exportPermit: false, oneOfAKind: true,
    story: 'Paired strokes mark the path of a cassowary moving through the forest.', significance: 'The cassowary appears in many origin stories of the Oro coast.' },
  { id: 'w14', title: 'Tolai shell money armband', artistId: 'a4', category: 'jewellery', province: 'east-new-britain', price: 220, pattern: 'shell', variant: 1, materials: ['shell'], techniques: [], dimensions: 'Adjustable', weightKg: 0.1, exportPermit: false, oneOfAKind: false,
    story: 'Threaded nassa shells in the style of tabu shell money.', significance: 'Tabu is still used in Tolai ceremonies alongside the kina.' },
  { id: 'w15', title: 'Pandanus market basket', artistId: 'a5', category: 'baskets', province: 'bougainville', price: 95, pattern: 'basket', variant: 1, materials: ['pandanus'], techniques: ['coil-weaving'], dimensions: '35 × 25 cm', weightKg: 0.3, exportPermit: false, oneOfAKind: false,
    story: 'An everyday carry basket with a fold-over flap.', significance: 'Pandanus weaving is taught early and used every day.' },
  { id: 'w16', title: 'Kula canoe prow board', artistId: 'a6', category: 'carvings', province: 'milne-bay', price: 1450, pattern: 'carve', variant: 2, materials: ['softwood', 'natural-pigment'], techniques: ['relief-carving'], dimensions: '70 × 40 cm', weightKg: 3, exportPermit: true, oneOfAKind: true,
    story: 'A painted splashboard in red, black and white, like those on kula voyaging canoes.', significance: 'Prow boards were made to impress trading partners and calm the sea.' },
  { id: 'w17', title: 'Mudman of Asaro (painting)', artistId: 'a7', category: 'paintings', province: 'western-highlands', price: 380, pattern: 'paint', variant: 1, materials: ['acrylic'], techniques: [], dimensions: '60 × 60 cm canvas', weightKg: 0.9, exportPermit: false, oneOfAKind: true,
    story: 'Grace\'s view of the famous clay-masked mudmen from the Asaro valley.', significance: 'The mudmen are among the best-known images of the Highlands.' },
  { id: 'w18', title: 'Incised clay bowl', artistId: 'a8', category: 'pottery', province: 'east-sepik', price: 150, pattern: 'pottery', variant: 1, materials: ['clay'], techniques: ['clay-coiling'], dimensions: '24 × 12 cm', weightKg: 1.1, exportPermit: false, oneOfAKind: true,
    story: 'A sago bowl with spiralling incised lines.', significance: 'Sago is the staple food of the Sepik; bowls like this serve it.' },
  { id: 'w19', title: 'Kina shell pendant', artistId: 'a9', category: 'jewellery', province: 'manus', price: 120, pattern: 'shell', materials: ['shell'], techniques: [], dimensions: '12 cm crescent', weightKg: 0.1, exportPermit: true, oneOfAKind: true,
    story: 'A polished crescent of gold-lip pearl shell on a woven cord.', significance: 'The kina shell gave PNG\'s currency its name.' },
  { id: 'w20', title: 'Spirit mask, Sepik style', artistId: 'a1', category: 'masks', province: 'east-sepik', price: 720, pattern: 'mask', materials: ['softwood', 'shell', 'natural-pigment'], techniques: ['relief-carving'], dimensions: '55 × 22 cm', weightKg: 1.3, exportPermit: true, oneOfAKind: true,
    story: 'Long-nosed mask with cowrie-shell eyes and painted clan patterns.', significance: 'Masks represent ancestral spirits and were kept in the haus tambaran.' },
  { id: 'w21', title: 'Wool bilum, flag colours (small)', artistId: 'a2', category: 'bilums', province: 'eastern-highlands', price: 90, pattern: 'bilum', variant: 2, materials: ['wool'], techniques: ['bilum-looping'], dimensions: '25 × 22 cm', weightKg: 0.2, exportPermit: false, oneOfAKind: false,
    story: 'A small everyday bilum for phone and keys.', significance: 'Bilums in national colours became popular after independence in 1975.' },
];

export const seedArtworks: Artwork[] = raw.map((a, i) => ({
  ...a,
  images: [],
  status: 'live',
  views: a.views ?? 120 + ((i * 337) % 2400),
  createdAt: t0 + i * 2 * DAY,
  certificateSerial: `TA-COA-${provinces.find((p) => p.slug === a.province)!.code}-2026-${String(4200 + i * 17).padStart(6, '0')}`,
}));

export const stories: Story[] = [
  { slug: 'bilum-a-mothers-carry', title: 'The bilum: a mother\'s carry', province: 'eastern-highlands', category: 'bilums', teller: 'Told by Mary Tumu', readMins: 5, pattern: 'bilum',
    intro: 'Almost every family in Papua New Guinea owns a bilum. It carries sweet potato from the garden, a sleeping baby, a laptop to the office.',
    chapters: [
      { title: 'One string', body: 'A bilum is looped from a single continuous string. There are no knots. If you pull the right end, the whole bag could in theory unravel back into one long line.' },
      { title: 'From bark to wool', body: 'The oldest bilums are made from bark fibre rolled on the thigh. Since the 1960s, bright wool and acrylic yarns have let makers invent new patterns, including the national colours.' },
      { title: 'Carried with the head', body: 'The strap rests across the forehead so the weight sits on the back and the hands stay free. A full garden bilum can weigh more than twenty kilos.' },
      { title: 'A gift that holds a life', body: 'Bilums are given at weddings, births and funerals. In Tok Pisin, "bilum" is also used for the womb: the bag that carries life.' },
    ] },
  { slug: 'barkcloth-that-maps-the-land', title: 'Barkcloth that maps the land', province: 'oro', category: 'tapa', teller: 'Told by Ruth Sevaru', readMins: 6, pattern: 'tapa',
    intro: 'On the Oro coast, women beat the bark of the paper mulberry into cloth and paint it with designs that belong to their families.',
    chapters: [
      { title: 'The tree', body: 'Young paper mulberry trees are cut and the inner bark stripped away in long ribbons, then soaked in the river.' },
      { title: 'The beating', body: 'On a smooth log, the bark is beaten with a grooved mallet. Slowly a narrow strip spreads into a wide, soft sheet.' },
      { title: 'The designs', body: 'Rings for mountains, lines for rivers, paired strokes for cassowary tracks. A woman paints the designs she has the right to paint, passed from her mother.' },
    ] },
  { slug: 'storyboards-of-the-keram', title: 'Storyboards of the Keram River', province: 'east-sepik', category: 'carvings', teller: 'Told by Joseph Kaman', readMins: 7, pattern: 'carve',
    intro: 'Storyboards began when carvers translated the designs on house gables into flat panels that visitors could carry home.',
    chapters: [
      { title: 'From gable to board', body: 'Kambot carvers once decorated the gables of the haus tambaran, the spirit house. Flat boards let the same stories travel.' },
      { title: 'Reading a board', body: 'Read left to right like a strip: ancestors, animals, journeys. The crocodile almost always appears; it is the great ancestor of the Sepik.' },
      { title: 'Colour', body: 'Red ochre, white lime and black charcoal fill the carved surfaces so the story can be seen from across a room.' },
    ] },
  { slug: 'baskets-that-hold-water', title: 'Baskets that hold water', province: 'bougainville', category: 'baskets', teller: 'Told by Lucy Siune', readMins: 4, pattern: 'basket',
    intro: 'Buka baskets are coiled so tightly that the best of them can hold water.',
    chapters: [
      { title: 'Vine and patience', body: 'Forest vines are split, dried and coiled into a spiral, stitch by stitch.' },
      { title: 'The click of the lid', body: 'Weavers judge a basket by its lid. A good one closes with a soft click and no gap.' },
      { title: 'Weaving after the crisis', body: 'After years of conflict, basket weaving helped many Bougainville families earn an income again.' },
    ] },
  { slug: 'masks-of-the-night-fire', title: 'Masks of the night fire', province: 'east-new-britain', category: 'masks', teller: 'Told by Peni Tovue', readMins: 5, pattern: 'mask', variant: 1,
    intro: 'In the hills of East New Britain, Baining dancers wear tall barkcloth masks and leap through bonfires at night.',
    chapters: [
      { title: 'Made for one night', body: 'Traditional fire-dance masks are made fresh for each ceremony and often destroyed after.' },
      { title: 'The festival', body: 'Each July, groups from across the islands gather in Kokopo for the National Mask Festival.' },
      { title: 'Display masks', body: 'Masks made for sale are smaller display versions, made with the same methods so the knowledge stays alive.' },
    ] },
];

export const resources = {
  institutions: [
    { name: 'National Museum & Art Gallery', place: 'Port Moresby', note: 'National collection; issues export permits for cultural items.', url: 'https://www.museum.gov.pg' },
    { name: 'PNG National Cultural Commission', place: 'Port Moresby', note: 'Supports festivals and cultural preservation.', url: 'https://www.ncc.gov.pg' },
  ],
  festivals: [
    { name: 'National Mask Festival', place: 'Kokopo, East New Britain', month: 'July' },
    { name: 'Mount Hagen Cultural Show', place: 'Western Highlands', month: 'August' },
    { name: 'Goroka Show', place: 'Eastern Highlands', month: 'September' },
    { name: 'Crocodile Festival', place: 'Ambunti, East Sepik', month: 'August' },
  ],
  glossary: [
    { term: 'Tumbuna', meaning: 'Ancestors; also grandparents.' },
    { term: 'Bilum', meaning: 'Looped string bag; also used for the womb.' },
    { term: 'Kundu', meaning: 'Hourglass hand drum with a lizard-skin head.' },
    { term: 'Garamut', meaning: 'Large slit drum used to send messages.' },
    { term: 'Haus tambaran', meaning: 'Spirit house, a men\'s ceremonial house in the Sepik.' },
    { term: 'Singsing', meaning: 'Gathering with song, dance and costume.' },
    { term: 'Bilas', meaning: 'Body decoration: paint, feathers, shells.' },
    { term: 'Kula', meaning: 'Ceremonial exchange ring of the Milne Bay islands.' },
    { term: 'Tapa', meaning: 'Barkcloth beaten from tree bark.' },
  ],
  protocols: [
    'Ask before photographing people or ceremonies.',
    'Some designs belong to families or clans. Buy from the makers who hold the right to them.',
    'Items made for ceremony are not always for sale. Respect a "no".',
    'Antique and sacred objects need a National Museum export permit. New works made for sale usually do not, but check the listing.',
  ],
};

export const seedReviews: Review[] = [
  { id: 'r1', artworkId: 'w1', artistId: 'a1', userName: 'Hannah, Brisbane', rating: 5, tags: ['Beautiful craft', 'Well packed'], text: 'Even better in person. The story card from Joseph made it special.', photos: [], at: t0 - 20 * DAY },
  { id: 'r2', artworkId: 'w20', artistId: 'a1', userName: 'Tom, Lae', rating: 5, tags: ['Great communication'], text: 'Joseph sent photos while he was carving. Arrived safely in five days.', photos: [], at: t0 - 12 * DAY },
  { id: 'r3', artworkId: 'w2', artistId: 'a2', userName: 'Aiko, Tokyo', rating: 5, tags: ['Beautiful craft'], text: 'The colours are so bright. I use it every day.', photos: [], at: t0 - 8 * DAY },
  { id: 'r4', artworkId: 'w5', artistId: 'a5', userName: 'Museum shop buyer, Wellington', rating: 4, tags: ['Well packed'], text: 'Superb weaving. Shipping took three weeks but it was worth it.', photos: [], at: t0 - 5 * DAY },
  { id: 'r5', artworkId: 'w3', artistId: 'a3', userName: 'Kila, Port Moresby', rating: 5, tags: ['Beautiful craft', 'Great communication'], text: 'Framed it for our office. Visitors always ask about it.', photos: [], at: t0 - 3 * DAY },
];

/** Demo accounts so every flow can be tried on one device. */
export const seedUsers: User[] = [
  { id: 'u-buyer', name: 'Kila Morea', email: 'kila@example.com', phone: '+675 7000 0001', password: 'tumbuna123', role: 'buyer', country: 'Papua New Guinea', city: 'Port Moresby', createdAt: t0 },
  { id: 'u-artist', name: 'Joseph Kaman', email: 'joseph@example.com', phone: '+675 7000 0002', password: 'tumbuna123', role: 'artist', artistId: 'a1', country: 'Papua New Guinea', city: 'Wewak', createdAt: t0 },
];

const sampleAddress = { name: 'Hannah Lee', phone: '+61 400 000 000', line1: '12 River Terrace', city: 'Brisbane', province: 'QLD', country: 'Australia', postcode: '4000' };

/** Sample incoming orders for the demo artist, so Studio has something to fulfil. */
export const seedOrders: Order[] = [
  { id: 'o-s1', number: 'TA-260411', buyerId: 'sample', buyerName: 'Hannah Lee', items: [{ artworkId: 'w12', price: 420 }], address: sampleAddress,
    shipping: { id: 'dhl', label: 'DHL Express', carrier: 'DHL', price: 165, eta: '4–7 days' }, permitFee: 0, subtotal: 420, total: 585, payment: 'Card', status: 'placed',
    events: [{ status: 'placed', at: Date.now() - 2 * 3600_000 }], createdAt: Date.now() - 2 * 3600_000, simulated: false, sample: true },
  { id: 'o-s2', number: 'TA-260398', buyerId: 'sample', buyerName: 'Tom Kapi', items: [{ artworkId: 'w20', price: 720 }], address: { ...sampleAddress, name: 'Tom Kapi', city: 'Lae', province: 'Morobe', country: 'Papua New Guinea', postcode: '411' },
    shipping: { id: 'post', label: 'Post PNG Standard', carrier: 'Post PNG', price: 35, eta: '5–9 days' }, permitFee: 0, subtotal: 720, total: 755, payment: 'Mobile money', status: 'delivered',
    events: [{ status: 'placed', at: t0 - 14 * DAY }, { status: 'packed', at: t0 - 13 * DAY }, { status: 'shipped', at: t0 - 12 * DAY }, { status: 'delivered', at: t0 - 7 * DAY }],
    trackingNo: 'PNG4471220', createdAt: t0 - 14 * DAY, confirmedAt: t0 - 7 * DAY, simulated: false, sample: true, reviewed: true },
];
