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
      'Interactive full-body human anatomy atlas—peel skin and musculature layers, isolate organ systems, hide structures to dissect deeper tissues, and inspect 3D physiological motion.',
    defaultCamera: {
      position: [0.35, 2.15, 4.75],
      target: [0, 1.78, 0],
    },
    parts: [
      {
        id: 'brain',
        name: 'Brain & Cranial Core',
        system: 'Nervous System',
        summary: 'Cerebral hemispheres, cerebellum, and brainstem coordinating cognition and autonomic vitals.',
        functionality:
          'Processes cortical sensory input, governs voluntary motor commands, consolidates memory, and regulates breathing and heart rate via the medulla and pons.',
        keyFacts: [
          'Contains ~86 billion neurons interconnected by trillions of synapses',
          'Gyri and sulci fold cortical surface area to ~2,400 cm²',
          'Cerebellum coordinates posture, balance, and fine motor precision',
        ],
        accentHex: '#f4a28c',
      },
      {
        id: 'nervous_network',
        name: 'Spinal Cord & Peripheral Nerves',
        system: 'Nervous System',
        summary: 'Spinal tract, brachial plexus, intercostal nerves, and sciatic/femoral branches.',
        functionality:
          'Relays rapid bidirectional action potentials between the brain and skeletal muscles, skin receptors, and visceral organs.',
        keyFacts: [
          'Sciatic nerve is the widest and longest peripheral nerve in the body',
          'Brachial plexus innervates shoulders, arms, and hands',
          'Myelin sheaths accelerate action potential conduction up to 120 m/s',
        ],
        accentHex: '#facc15',
      },
      {
        id: 'eyes_senses',
        name: 'Eyes & Optic Pathways',
        system: 'Nervous & Sensory',
        summary: 'Paired ocular globes seated in the orbital sockets with posterior optic nerves.',
        functionality:
          'Refracts light through the cornea and crystalline lens onto retinal photoreceptors, transmitting visual signals down the optic nerves to the visual cortex.',
        keyFacts: [
          'Retina houses ~120 million rods and ~6 million color-sensitive cones',
          'Six extraocular muscles rotate each eyeball with millisecond precision',
          'Optic chiasm merges left and right visual fields',
        ],
        accentHex: '#38bdf8',
      },
      {
        id: 'heart',
        name: 'Heart (Four Chambers)',
        system: 'Circulatory System',
        summary: 'Muscular four-chambered pump driving pulmonary and systemic blood circulation.',
        functionality:
          'Contracts in coordinated Lub-Dub cycles: right chambers pump deoxygenated blood to the lungs while the thick left ventricle ejects oxygenated blood into the aorta.',
        keyFacts: [
          'Beats roughly 100,000 times per day (~70–75 bpm at rest)',
          'Coronary arteries wrap the myocardium to nourish heart muscle itself',
          'Four one-way valves enforce unidirectional blood flow',
        ],
        accentHex: '#dc2626',
      },
      {
        id: 'vascular',
        name: 'Arterial & Venous Tree',
        system: 'Circulatory System',
        summary: 'Aorta, carotid, subclavian, iliac/femoral arteries paired with venae cavae and jugular veins.',
        functionality:
          'Distributes oxygenated blood and hormones under arterial pressure while returning venous blood via one-way venous valves and the hepatic portal system.',
        keyFacts: [
          'Aorta arches superiorly before descending along the thoracic spine',
          'Superior and inferior vena cava empty directly into the right atrium',
          'Total human vascular network spans nearly 100,000 km including capillaries',
        ],
        accentHex: '#ef4444',
      },
      {
        id: 'lungs',
        name: 'Lungs, Trachea & Diaphragm',
        system: 'Respiratory System',
        summary: 'Cartilage-ringed airway, bronchial branches, elastic lungs, and muscular diaphragm dome.',
        functionality:
          'Diaphragm contraction lowers thoracic pressure to draw air down the trachea and bronchi into ~300 million alveoli for O₂/CO₂ gas exchange.',
        keyFacts: [
          'Right lung has 3 lobes; left lung has 2 lobes plus the cardiac notch',
          'Alveolar surface area totals ~70 square meters for gas diffusion',
          'Diaphragm drives roughly 75% of quiet tidal inspiration',
        ],
        accentHex: '#fb7185',
      },
      {
        id: 'liver',
        name: 'Liver & Gallbladder',
        system: 'Digestive System',
        summary: 'Bilobed metabolic gland and emerald gallbladder tucked beneath the right diaphragm.',
        functionality:
          'Detoxifies portal blood, regulates blood glucose via glycogenolysis, synthesizes plasma proteins, and produces bile stored in the gallbladder for lipid digestion.',
        keyFacts: [
          'Performs over 500 distinct metabolic and synthetic functions',
          'Receives dual blood supply from hepatic artery and portal vein',
          'Only visceral organ capable of full tissue regeneration',
        ],
        accentHex: '#9f3b28',
      },
      {
        id: 'stomach',
        name: 'Esophagus & Stomach',
        system: 'Digestive System',
        summary: 'Muscular esophagus and J-shaped gastric chamber with protective mucosal folds.',
        functionality:
          'Propels swallowed food via peristalsis into the stomach, where hydrochloric acid (pH ~1.8) and pepsin digest proteins into semi-liquid chyme.',
        keyFacts: [
          'Internal rugae ridges flatten as the stomach distends during a meal',
          'Bicarbonate-rich mucus shields gastric epithelium from self-digestion',
          'Pyloric sphincter meters chyme into the duodenum',
        ],
        accentHex: '#ea8c55',
      },
      {
        id: 'intestines',
        name: 'Small & Large Intestines',
        system: 'Digestive System',
        summary: 'Coiled jejunum/ileum loops framed by the haustrated colon and appendix.',
        functionality:
          'Villi and microvilli absorb amino acids, sugars, lipids, and vitamins in the small intestine while the colon reclaims water and electrolytes.',
        keyFacts: [
          'Small intestine spans ~6 meters with enormous microvilli surface area',
          'Large intestine features ascending, transverse, descending, and sigmoid segments',
          'Continuous smooth-muscle peristalsis advances luminal contents',
        ],
        accentHex: '#d97757',
      },
      {
        id: 'endocrine_lymph',
        name: 'Thyroid, Thymus, Spleen & Pancreas',
        system: 'Endocrine & Lymphatic',
        summary: 'Key hormone-secreting glands and immune filtration organs spanning neck and abdomen.',
        functionality:
          'Thyroid regulates basal metabolism, thymus matures T-lymphocytes, spleen filters aged erythrocytes, and pancreas secretes insulin/glucagon plus digestive enzymes.',
        keyFacts: [
          'Pancreas functions as both an endocrine (islets) and exocrine gland',
          'Butterfly-shaped thyroid wraps directly anterior to the upper trachea',
          'Spleen holds an emergency reservoir of red blood cells and platelets',
        ],
        accentHex: '#a855f7',
      },
      {
        id: 'kidneys',
        name: 'Kidneys, Ureters & Bladder',
        system: 'Urinary System',
        summary: 'Retroperitoneal kidneys with adrenal caps, descending ureters, and pelvic urinary bladder.',
        functionality:
          'Nephrons filter blood plasma to excrete nitrogenous wastes while balancing water, electrolytes, blood pH, and arterial blood pressure.',
        keyFacts: [
          'Kidneys filter ~180 liters of filtrate daily while excreting ~1.5 L urine',
          'Right kidney sits slightly lower than the left due to the liver lobe',
          'Smooth detrusor muscle stretches to store urine inside the bladder',
        ],
        accentHex: '#b91c1c',
      },
      {
        id: 'skeleton',
        name: 'Full Human Skeleton',
        system: 'Skeletal System',
        summary: 'Skull, mandible, vertebral column, thoracic ribcage, clavicles, pelvis, and limb bones.',
        functionality:
          'Provides rigid leverage for movement, shields brain and thoracic viscera, produces blood cells inside red marrow, and banks calcium/phosphate reserves.',
        keyFacts: [
          'Adult human skeleton consists of 206 articulated bones',
          'Femur is the longest, heaviest, and strongest bone in the body',
          'Ribcage flexes outward slightly with each breath cycle',
        ],
        accentHex: '#ebe4d4',
      },
      {
        id: 'muscles',
        name: 'Skeletal Musculature',
        system: 'Muscular System',
        summary: 'Striated pectorals, deltoids, rectus abdominis, obliques, quadriceps, and calves.',
        functionality:
          'Contracts along sarcomere myofibril fibers to move joints, stabilize posture, protect abdominal viscera, and generate thermoregulatory body heat.',
        keyFacts: [
          'Over 600 skeletal muscles account for ~40% of adult body mass',
          'Rectus abdominis is divided by tendinous intersections into paired bellies',
          'Quadriceps femoris is the strongest extensor group in the lower limb',
        ],
        accentHex: '#b91c2e',
      },
      {
        id: 'outer_body',
        name: 'Integumentary Skin Envelope',
        system: 'Integumentary System',
        summary: 'Anatomically sculpted epidermal/dermal body envelope housing touch and sweat glands.',
        functionality:
          'Protects deeper tissues against pathogens and UV radiation, synthesizes vitamin D, senses touch/temperature, and dissipates heat via perspiration.',
        keyFacts: [
          'Skin is the body’s largest organ (~1.8 m² surface area in adults)',
          'Peel or Hide this layer to inspect striated muscles and internal organs',
          'Dermal capillary beds dilate or constrict to regulate core temperature',
        ],
        accentHex: '#94a3b8',
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

