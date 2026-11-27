import { CATEGORY_META, OrganismCategory } from './anatomyTypes';
import {
  ORGANISMS_PART_1,
  BodyPartInfo,
  OrganismDefinition,
} from './organismsPart1';
import { ORGANISMS_PART_2 } from './organismsPart2';

export { CATEGORY_META };
export type { OrganismCategory, BodyPartInfo, OrganismDefinition };
export type OrganismId = string;

const CORE_ORGANISMS: OrganismDefinition[] = [
  {
    id: 'human',
    name: 'Human Body',
    scientificName: 'Homo sapiens',
    category: 'Human Anatomy',
    categoryKey: 'human',
    overview:
      'Explore major human organ systems—nervous, circulatory, respiratory, digestive, renal, and skeletal—in an interactive 3D cutaway.',
    defaultCamera: {
      position: [0.4, 2.3, 4.9],
      target: [0, 1.85, 0],
    },
    parts: [
      {
        id: 'brain',
        name: 'Brain',
        system: 'Nervous System',
        summary: 'Central command center controlling thought, sensation, memory, and movement.',
        functionality:
          'Processes sensory input across cortical lobes, coordinates voluntary muscle contraction via motor pathways, and regulates heart rate and breathing through the brainstem.',
        keyFacts: [
          'Contains ~86 billion neurons connected by trillions of synapses',
          'Consumes roughly 20% of the body’s total oxygen and glucose',
          'Cerebellum coordinates balance and fine motor precision',
        ],
        accentHex: '#f4a28c',
      },
      {
        id: 'heart',
        name: 'Heart',
        system: 'Circulatory System',
        summary: 'Four-chambered muscular pump driving blood through pulmonary and systemic loops.',
        functionality:
          'Right chambers send oxygen-poor blood to the lungs; left chambers pump oxygen-rich blood through the aorta to every tissue in the body.',
        keyFacts: [
          'Beats approximately 100,000 times per day (~70 bpm at rest)',
          'One-way valves prevent backflow between atria and ventricles',
          'Coronary arteries supply the cardiac muscle wall itself',
        ],
        accentHex: '#dc2626',
      },
      {
        id: 'lungs',
        name: 'Lungs & Trachea',
        system: 'Respiratory System',
        summary: 'Paired elastic organs that exchange oxygen and carbon dioxide across alveoli.',
        functionality:
          'Air travels down the cartilage-ringed trachea into branching bronchi and millions of microscopic alveoli, where oxygen diffuses into capillaries and CO₂ exits.',
        keyFacts: [
          'Right lung has 3 lobes; left lung has 2 lobes to make room for the heart',
          'Alveolar surface area totals roughly 70 square meters',
          'Diaphragm contraction lowers chest pressure to draw air inward',
        ],
        accentHex: '#fb7185',
      },
      {
        id: 'liver',
        name: 'Liver',
        system: 'Digestive & Metabolic',
        summary: 'Largest internal gland handling detoxification, bile production, and energy storage.',
        functionality:
          'Filters nutrient-rich blood from the hepatic portal vein, neutralizes toxins, stores glucose as glycogen, synthesizes plasma proteins, and secretes bile to emulsify fats.',
        keyFacts: [
          'Performs more than 500 distinct biochemical functions',
          'Capable of regenerating functional tissue after partial loss',
          'Receives dual blood supply from hepatic artery and portal vein',
        ],
        accentHex: '#9f3b28',
      },
      {
        id: 'stomach',
        name: 'Stomach',
        system: 'Digestive System',
        summary: 'Muscular J-shaped chamber that chemically and mechanically breaks down food.',
        functionality:
          'Secretes hydrochloric acid (pH ~1.5–2) and pepsinogen to denature proteins and eliminate microbes while churning food into semi-liquid chyme.',
        keyFacts: [
          'Mucus lining shields stomach walls from digesting themselves',
          'Rugae folds allow volume expansion after large meals',
          'Pyloric sphincter meters chyme release into the duodenum',
        ],
        accentHex: '#ea8c55',
      },
      {
        id: 'kidneys',
        name: 'Kidneys',
        system: 'Urinary & Excretory',
        summary: 'Bean-shaped filtration organs balancing fluids, electrolytes, and blood pressure.',
        functionality:
          'Over one million nephrons per kidney filter blood plasma, reabsorb essential glucose and ions, and excrete urea and excess water as urine down the ureters.',
        keyFacts: [
          'Filter roughly 180 liters of blood filtrate every 24 hours',
          'Release erythropoietin to stimulate red blood cell production',
          'Regulate acid-base pH and systemic arterial pressure',
        ],
        accentHex: '#7f1d1d',
      },
      {
        id: 'intestines',
        name: 'Intestinal Tract',
        system: 'Digestive System',
        summary: 'Coiled small intestine and framed colon responsible for nutrient and water absorption.',
        functionality:
          'Villi and microvilli in the small intestine absorb amino acids, simple sugars, and fatty acids; the large intestine reclaims water and hosts beneficial gut flora.',
        keyFacts: [
          'Small intestine averages ~6 meters in length',
          'Microvilli boost absorptive surface area dramatically',
          'Peristaltic smooth muscle waves propel contents forward',
        ],
        accentHex: '#d97757',
      },
      {
        id: 'skeleton',
        name: 'Skeleton & Ribcage',
        system: 'Skeletal System',
        summary: 'Rigid mineralized framework protecting vital organs and enabling locomotion.',
        functionality:
          'Cranium shields the brain, ribcage encloses the heart and lungs, vertebrae support posture, limb bones act as levers for muscles, and bone marrow produces blood cells.',
        keyFacts: [
          'Adult human skeleton consists of 206 bones',
          'Red bone marrow generates erythrocytes, leukocytes, and platelets',
          'Stores 99% of the body’s calcium and phosphorus reserves',
        ],
        accentHex: '#e5e0d5',
      },
      {
        id: 'outer_body',
        name: 'Integument & Muscular Shell',
        system: 'Integumentary System',
        summary: 'Protective outer body envelope formed by skin, fascia, and skeletal musculature.',
        functionality:
          'Forms a waterproof microbial barrier, regulates core temperature through sweat and vasodilation, houses touch thermoreceptors, and shapes body posture.',
        keyFacts: [
          'Skin is the body’s largest organ by surface area',
          'Toggle X-Ray Shell in the dock to inspect deeper organs clearly',
          'Skeletal muscles make up ~40% of healthy adult body mass',
        ],
        accentHex: '#64748b',
      },
    ],
  },
  {
    id: 'bee',
    name: 'Honeybee',
    scientificName: 'Apis mellifera',
    category: 'Insects & Arachnids',
    categoryKey: 'insects',
    overview:
      'Inspect the three specialized insect tagmata—head, thorax, and abdomen—plus compound eyes, wings, and pollen-carrying legs.',
    defaultCamera: {
      position: [3.2, 2.2, 3.8],
      target: [0, 1.05, 0],
    },
    parts: [
      {
        id: 'bee_head',
        name: 'Head & Compound Eyes',
        system: 'Sensory & Feeding',
        summary: 'Chitinous head capsule bearing faceted compound eyes, three ocelli, and mouthparts.',
        functionality:
          'Thousands of hexagonal ommatidia detect ultraviolet flower nectar guides and polarized sunlight for navigation, while the proboscis sips floral nectar.',
        keyFacts: [
          'Sees ultraviolet wavelengths invisible to humans',
          'Three dorsal simple eyes (ocelli) sense horizon light intensity',
          'Mandibles mold beeswax and groom the hive',
        ],
        accentHex: '#eab308',
      },
      {
        id: 'bee_antennae',
        name: 'Segmented Antennae',
        system: 'Chemosensory System',
        summary: 'Elbowed sensory appendages packed with olfactory and mechanosensory receptors.',
        functionality:
          'Detects floral scents, alarm/queen pheromones, humidity, CO₂ levels, and flight airspeed via Johnston’s organ at the pedicel base.',
        keyFacts: [
          'Worker antennae house ~170 odorant receptor types',
          'Used to read waggle-dance vibrations inside dark hives',
          'Distinctive elbowed (geniculate) hinge joint',
        ],
        accentHex: '#a16207',
      },
      {
        id: 'bee_thorax',
        name: 'Thorax',
        system: 'Locomotor Core',
        summary: 'Dense muscular midsection anchoring two pairs of wings and three pairs of legs.',
        functionality:
          'Houses large dorsoventral and longitudinal flight muscles that deform the thoracic exoskeleton to flap wings ~230 times per second.',
        keyFacts: [
          'Contains three fused segments: prothorax, mesothorax, metathorax',
          'Flight muscles also generate heat to warm the brood nest',
          'Covered in branched plumose hairs that trap pollen electrostatically',
        ],
        accentHex: '#92400e',
      },
      {
        id: 'bee_wings',
        name: 'Forewings & Hindwings',
        system: 'Flight Apparatus',
        summary: 'Two pairs of membranous veined wings coupled in flight by tiny hamuli hooks.',
        functionality:
          'Generates high-lift leading-edge vortices during rapid figure-eight wingstrokes and ventilates the hive to evaporate nectar into honey.',
        keyFacts: [
          'Hooks called hamuli lock forewing and hindwing into one airfoil',
          'Wingbeat frequency reaches ~230 Hz during loaded foraging flight',
          'Chitinous veins stiffen the flexible membrane without excess weight',
        ],
        accentHex: '#bae6fd',
      },
      {
        id: 'bee_legs',
        name: 'Jointed Legs & Pollen Baskets',
        system: 'Locomotion & Foraging',
        summary: 'Six articulated legs equipped with antenna cleaners and hind-leg pollen baskets.',
        functionality:
          'Front legs clean dust from antennae; middle legs transfer pollen; hind tibiae feature concave corbiculae (pollen baskets) that pack moistened pollen pellets.',
        keyFacts: [
          'A single forager can carry up to 35% of her body weight in pollen',
          'Tarsal claws and adhesive pads grip smooth petals or rough bark',
          'Specialized pollen combs brush grains off body hairs',
        ],
        accentHex: '#f59e0b',
      },
      {
        id: 'bee_abdomen',
        name: 'Abdomen & Spiracles',
        system: 'Visceral & Respiratory',
        summary: 'Striped posterior body holding the honey stomach, wax glands, and breathing spiracles.',
        functionality:
          'Stores collected nectar in the honey crop, secretes wax scales from ventral glands, and pumps air directly to tissues via abdominal tracheal spiracles.',
        keyFacts: [
          'Alternating amber-gold and dark-brown tergite plates flex during breathing',
          'Honey stomach keeps nectar separate from the digestive midgut',
          'Ventral Nasonov gland releases orientation pheromones',
        ],
        accentHex: '#facc15',
      },
      {
        id: 'bee_stinger',
        name: 'Stinger Apparatus',
        system: 'Defense System',
        summary: 'Modified ovipositor with twin barbed lancets and attached venom reservoir.',
        functionality:
          'Defends the colony against mammalian predators by injecting apitoxin venom and releasing alarm pheromones to alert guard bees.',
        keyFacts: [
          'Present only in female workers and queens (modified egg-layer)',
          'Queen’s stinger is smooth so she can sting rival queens repeatedly',
          'Alarm scent (isoamyl acetate) smells faintly like banana',
        ],
        accentHex: '#dc2626',
      },
    ],
  },
  {
    id: 'plant',
    name: 'Flowering Plant',
    scientificName: 'Angiosperm Specimen',
    category: 'Plants & Fungi',
    categoryKey: 'plants',
    overview:
      'Examine vascular plant architecture from underground root absorption and photosynthetic leaves up to stamens and pistil.',
    defaultCamera: {
      position: [2.8, 2.5, 4.1],
      target: [0, 1.55, 0],
    },
    parts: [
      {
        id: 'plant_roots',
        name: 'Root System',
        system: 'Absorption & Anchorage',
        summary: 'Taproot and branching lateral roots anchoring the plant in mineral soil.',
        functionality:
          'Absorbs water and dissolved mineral ions (nitrogen, potassium, phosphorus) by osmosis and active transport while storing starch reserves.',
        keyFacts: [
          'Microscopic root hairs vastly multiply soil contact area',
          'Root cap protects the growing apical meristem',
          'Often partners with mycorrhizal fungi for phosphorus uptake',
        ],
        accentHex: '#a16207',
      },
      {
        id: 'plant_stem',
        name: 'Vascular Stem',
        system: 'Transport & Support',
        summary: 'Vertical structural stalk housing xylem and phloem vascular bundles.',
        functionality:
          'Elevates leaves and blooms toward sunlight; xylem vessels pull water upward via transpiration cohesion-tension while phloem distributes sucrose.',
        keyFacts: [
          'Nodes mark attachment points where leaves and buds emerge',
          'Turgor pressure inside cells keeps herbaceous stems upright',
          'Vascular cambium adds thickness in woody species',
        ],
        accentHex: '#22c55e',
      },
      {
        id: 'plant_leaves',
        name: 'Photosynthetic Leaves',
        system: 'Photosynthesis & Transpiration',
        summary: 'Broad veined blades rich in chloroplasts with adjustable epidermal stomata.',
        functionality:
          'Captures solar photons in chlorophyll to convert CO₂ and water into glucose and oxygen, while stomatal guard cells regulate water vapor loss.',
        keyFacts: [
          'Palisade mesophyll cells pack dense chloroplasts near the upper surface',
          'Waxy cuticle minimizes uncontrolled evaporation',
          'Branching veins deliver water and export sugars',
        ],
        accentHex: '#16a34a',
      },
      {
        id: 'plant_sepals',
        name: 'Calyx (Sepals)',
        system: 'Floral Protection',
        summary: 'Outer ring of leaf-like green bracts cradling the flower base.',
        functionality:
          'Encloses and protects delicate petals, stamens, and ovules inside the unopened bud from frost, dehydration, and chewing insects.',
        keyFacts: [
          'Collectively called the calyx',
          'Remains at the base of the fruit in species like strawberries and tomatoes',
          'Photosynthesizes locally to nourish the developing flower',
        ],
        accentHex: '#4ade80',
      },
      {
        id: 'plant_petals',
        name: 'Corolla (Petals)',
        system: 'Pollinator Attraction',
        summary: 'Radiating pigmented floral leaves forming the colorful bloom.',
        functionality:
          'Signals nectar rewards to bees, butterflies, and birds using pigment coloration, landing platforms, and aromatic essential oils.',
        keyFacts: [
          'Collectively known as the corolla',
          'Many petals display ultraviolet nectar guides pointing inward',
          'Often close at night to shield pollen from dew',
        ],
        accentHex: '#ec4899',
      },
      {
        id: 'plant_stamens',
        name: 'Stamens (Anther & Filament)',
        system: 'Male Reproductive',
        summary: 'Slender stalks bearing pollen-producing bilobed anthers.',
        functionality:
          'Anthers undergo meiosis to produce pollen grains; filaments position the anthers cleanly against visiting pollinators for cross-pollination.',
        keyFacts: [
          'Each stamen consists of a stalk-like filament and a pollen-bearing anther',
          'Pollen grains carry tough outer exine walls against drying',
          'Anthers split open (dehisce) once pollen matures',
        ],
        accentHex: '#f59e0b',
      },
      {
        id: 'plant_pistil',
        name: 'Pistil (Stigma, Style & Ovary)',
        system: 'Female Reproductive',
        summary: 'Central bottle-shaped carpel housing sticky stigma, elongated style, and ovary.',
        functionality:
          'Receptive stigma captures pollen grains, guides a pollen tube down the style, and enables double fertilization of ovules inside the ovary to form seeds.',
        keyFacts: [
          'Ovary swells into a protective fruit after fertilization',
          'Ovules inside the ovary become mature seeds',
          'Stigma surface secretes sugars to hydrate compatible pollen',
        ],
        accentHex: '#a3e635',
      },
    ],
  },
  {
    id: 'fish',
    name: 'Bony Fish',
    scientificName: 'Osteichthyes Specimen',
    category: 'Fish & Marine',
    categoryKey: 'marine',
    overview:
      'Study streamlined aquatic biomechanics—gills for underwater respiration, rayed fins for steering, lateral line sensing, and swim bladder buoyancy.',
    defaultCamera: {
      position: [2.8, 1.9, 4.1],
      target: [0, 1.05, 0],
    },
    parts: [
      {
        id: 'fish_head',
        name: 'Cranium & Sensory Eyes',
        system: 'Sensory & Feeding',
        summary: 'Hydrodynamic anterior skull with wide-field lens eyes, nostrils, and hinged jaw.',
        functionality:
          'Focuses underwater using spherical crystalline lenses, samples dissolved amino acids via olfactory nares, and creates suction to capture prey.',
        keyFacts: [
          'Spherical lens shifts forward/back to focus rather than changing shape',
          'Nares (nostrils) lead to olfactory rosettes, not to lungs',
          'Streamlined snout cuts hydrodynamic drag during bursts',
        ],
        accentHex: '#38bdf8',
      },
      {
        id: 'fish_gills',
        name: 'Operculum & Gills',
        system: 'Respiratory System',
        summary: 'Bony protective flap covering layered crimson gill filaments and arches.',
        functionality:
          'Pumps water across thin gill lamellae where blood flows opposite to water (countercurrent exchange), extracting up to 85% of dissolved oxygen.',
        keyFacts: [
          'Countercurrent blood/water flow maximizes oxygen gradient',
          'Operculum protects delicate filaments from debris',
          'Gills also excrete ammonia waste and regulate salt balance',
        ],
        accentHex: '#ef4444',
      },
      {
        id: 'fish_body',
        name: 'Trunk & Lateral Line',
        system: 'Muscular & Mechanosensory',
        summary: 'Scale-armored muscular trunk scored with the pressure-sensing lateral line.',
        functionality:
          'Segmented myomere muscles flex the spine in S-waves; the lateral line canal senses minute water vibrations from currents, predators, or schooling neighbors.',
        keyFacts: [
          'Neuromast hair cells inside lateral line pores detect pressure waves',
          'Overlapping cycloid scales shed turbulence and protect skin',
          'Countershading (dark back, pale belly) camouflages against depth',
        ],
        accentHex: '#0284c7',
      },
      {
        id: 'fish_dorsal',
        name: 'Dorsal & Anal Fins',
        system: 'Stabilization',
        summary: 'Upper keel fin and ventral anal fin braced by slender bony fin rays.',
        functionality:
          'Acts like a ship’s keel to prevent rolling side-to-side during turns and stabilizes the fish while darting or hovering in currents.',
        keyFacts: [
          'Fin rays (lepidotrichia) can fold flat to reduce drag at high speed',
          'Spiny anterior rays can deter predators in perch and bass',
          'Works together with the ventral anal fin to control yaw',
        ],
        accentHex: '#7dd3fc',
      },
      {
        id: 'fish_pectoral',
        name: 'Pectoral & Pelvic Fins',
        system: 'Maneuvering & Braking',
        summary: 'Paired lateral and ventral fins positioned behind the gills and beneath the belly.',
        functionality:
          'Steers sharp turns, acts as hydrodynamic airbrakes to stop suddenly, paddles backward, and controls upward/downward pitch.',
        keyFacts: [
          'Evolutionarily homologous to tetrapod forelimbs and hindlimbs',
          'Can scull gently to hold station against flowing water',
          'Pelvic fins help fine-tune roll stability',
        ],
        accentHex: '#22d3ee',
      },
      {
        id: 'fish_caudal',
        name: 'Caudal (Tail) Fin',
        system: 'Propulsion',
        summary: 'Forked crescent tail fin translating spinal muscle waves into forward thrust.',
        functionality:
          'Sweeps side-to-side to accelerate water backward, generating forward propulsion; forked geometry minimizes vortex drag during sustained swimming.',
        keyFacts: [
          'Forked/lunate tails are characteristic of fast open-water swimmers',
          'Homocercal symmetry delivers balanced horizontal thrust',
          'Generates the majority of forward acceleration',
        ],
        accentHex: '#0ea5e9',
      },
      {
        id: 'fish_swim_bladder',
        name: 'Swim Bladder',
        system: 'Buoyancy Control',
        summary: 'Internal gas-filled sac beneath the spine regulating underwater depth.',
        functionality:
          'Adjusts oxygen and nitrogen gas volume via the gas gland to match surrounding water density, letting the fish hover effortlessly without sinking.',
        keyFacts: [
          'Saves enormous swimming energy compared to sharks that lack one',
          'Visible inside the torso in Exploded or X-Ray mode',
          'Some species also use it as a resonant hearing or sound amplifier',
        ],
        accentHex: '#fde047',
      },
    ],
  },
];

export const ORGANISMS: OrganismDefinition[] = [
  ...CORE_ORGANISMS,
  ...ORGANISMS_PART_1,
  ...ORGANISMS_PART_2,
];

