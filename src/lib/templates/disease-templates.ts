/**
 * Starter Disease Documentation Library.
 *
 * These are *documentation scaffolds*, not diagnoses. The provider
 * selects, confirms, edits, and signs the final note. AI never
 * authorises a final diagnosis.
 *
 * Coding suggestions are illustrative only, practices must review
 * against their own coding policy and payer rules.
 */

export type StarterTemplate = {
  slug: string;
  name: string;
  category:
    | 'Anterior segment'
    | 'Posterior segment'
    | 'Refractive'
    | 'Neuro / referral'
    | 'Pediatric / myopia'
    | 'Emergency / urgent'
    | 'Lifestyle / digital';
  hpiPrompts: string[];
  examElements: string[];
  assessmentOptions: string[];
  planOptions: string[];
  educationPoints: string[];
  codingSuggestions: string[];
  referralCriteria: string[];
  followUpOptions: string[];
};

export const STARTER_DISEASE_TEMPLATES: StarterTemplate[] = [
  {
    slug: 'dry-eye-disease',
    name: 'Dry eye disease',
    category: 'Anterior segment',
    hpiPrompts: [
      'Burning, scratchy, foreign-body sensation?',
      'Worse with screens, AC, contacts, wind?',
      'Current artificial tears or lid hygiene?',
      'Systemic meds / Sjögren screen?',
    ],
    examElements: [
      'External lid + meibomian gland assessment',
      'Tear meniscus / TBUT',
      'Corneal staining (fluorescein)',
      'Lissamine green for conjunctiva',
      'Osmolarity / MMP-9 if available',
    ],
    assessmentOptions: [
      'Evaporative dry eye disease',
      'Aqueous deficient dry eye disease',
      'Mixed-mechanism dry eye disease',
      'Suspect Sjögren, workup recommended',
    ],
    planOptions: [
      'Preservative-free artificial tears 4×/day',
      'Warm compress + lid hygiene',
      'Omega-3 supplementation',
      'Cyclosporine or lifitegrast (after consent)',
      'Punctal occlusion candidate',
      'In-office IPL / thermal procedure candidate',
    ],
    educationPoints: [
      '20-20-20 rule for screen use',
      'Humidification and avoiding direct airflow',
      'Lid hygiene technique demonstration',
    ],
    codingSuggestions: [
      'H04.123 Dry eye syndrome of bilateral lacrimal glands',
      'Discuss MGD vs. ADDE coding nuance with biller',
    ],
    referralCriteria: [
      'Suspected immunologic / autoimmune driver → rheumatology',
      'Severe corneal staining unresolved on max medical therapy → cornea specialist',
    ],
    followUpOptions: ['4 weeks', '8 weeks', '12 weeks'],
  },
  {
    slug: 'myopia',
    name: 'Myopia',
    category: 'Refractive',
    hpiPrompts: [
      'Reduced distance vision; squinting?',
      'Last refraction + Rx change?',
      'Family history of high myopia?',
    ],
    examElements: [
      'Manifest + cycloplegic refraction',
      'Axial length if available',
      'Binocular function / NPC',
      'Fundus exam (peripheral retina)',
    ],
    assessmentOptions: [
      'Myopia, stable',
      'Progressive myopia',
      'High myopia (≥ -6.00D), monitor for retinal risk',
    ],
    planOptions: [
      'Single-vision glasses / contacts',
      'Consider myopia-management consult',
      'Routine dilated annual exam',
    ],
    educationPoints: [
      'Outdoor time + reading distance',
      'Myopia progression risks',
    ],
    codingSuggestions: ['H52.13 Myopia, bilateral'],
    referralCriteria: [
      'Significant peripheral retinal pathology → retina specialist',
    ],
    followUpOptions: ['6 months', '12 months'],
  },
  {
    slug: 'myopia-management',
    name: 'Myopia management',
    category: 'Pediatric / myopia',
    hpiPrompts: [
      'Annual progression rate?',
      'Outdoor / near-work habits?',
      'Family history of high myopia?',
      'Prior atropine, ortho-K, multifocal CL?',
    ],
    examElements: [
      'Cycloplegic refraction',
      'Axial length',
      'Binocular vision testing',
      'Corneal topography (if ortho-K candidate)',
    ],
    assessmentOptions: [
      'Childhood myopia, progressive',
      'Pre-myopia (low hyperopic reserve)',
    ],
    planOptions: [
      'Low-dose atropine (after informed consent)',
      'Ortho-K candidate',
      'Soft multifocal CL candidate',
      'Myopia-control spectacles (DIMS / HAL)',
    ],
    educationPoints: [
      'Goal: slow axial elongation, not perfect vision',
      'Adherence is critical',
    ],
    codingSuggestions: ['H52.13 Myopia, bilateral'],
    referralCriteria: ['Suspected pathology / high axial length'],
    followUpOptions: ['3 months', '6 months'],
  },
  {
    slug: 'contact-lens-evaluation',
    name: 'Contact lens evaluation',
    category: 'Refractive',
    hpiPrompts: [
      'Current modality and replacement schedule',
      'Comfort hours per day',
      'Hygiene practices',
      'Symptoms: redness, dryness, vision blur?',
    ],
    examElements: [
      'CL fit + centration + movement',
      'Corneal integrity (fluorescein)',
      'Lid eversion screening',
      'Over-refraction',
    ],
    assessmentOptions: [
      'Successful CL wear',
      'Discomfort with CL wear, investigate',
      'Limbal/papillary changes, modify modality',
    ],
    planOptions: [
      'Continue current modality',
      'Trial daily disposables',
      'Trial scleral / RGP / multifocal',
      'Add CL-friendly artificial tears',
    ],
    educationPoints: [
      'Avoid sleeping / showering in CL',
      'Replacement schedule adherence',
      'Lens case hygiene',
    ],
    codingSuggestions: ['Z44.4 Contact lens encounter (illustrative)'],
    referralCriteria: ['Significant corneal pathology → cornea specialist'],
    followUpOptions: ['1 week', '1 month', '6 months', '12 months'],
  },
  {
    slug: 'allergic-conjunctivitis',
    name: 'Allergic conjunctivitis',
    category: 'Anterior segment',
    hpiPrompts: [
      'Itching, redness, tearing?',
      'Seasonal vs perennial?',
      'Atopic comorbidities (asthma, eczema)?',
    ],
    examElements: [
      'Conjunctival injection + chemosis',
      'Tarsal papillae',
      'No corneal infiltrates',
    ],
    assessmentOptions: ['Allergic conjunctivitis'],
    planOptions: [
      'Cold compress',
      'OTC dual-action antihistamine drop',
      'Avoidance counseling',
    ],
    educationPoints: ['Avoid rubbing', 'Wash linens / pillowcases'],
    codingSuggestions: ['H10.45 Other chronic allergic conjunctivitis'],
    referralCriteria: ['Atypical / severe / recurrent → allergy / cornea consult'],
    followUpOptions: ['4 weeks', 'PRN'],
  },
  {
    slug: 'bacterial-conjunctivitis',
    name: 'Bacterial conjunctivitis',
    category: 'Anterior segment',
    hpiPrompts: [
      'Onset, discharge color/consistency',
      'Unilateral vs bilateral',
      'Recent exposure, contact lens wear',
    ],
    examElements: [
      'Discharge character + lid edema',
      'No corneal involvement (rule out keratitis)',
      'Preauricular lymphadenopathy',
    ],
    assessmentOptions: ['Bacterial conjunctivitis'],
    planOptions: [
      'Broad-spectrum topical antibiotic',
      'Discontinue CL until resolution',
      'Strict hygiene',
    ],
    educationPoints: ['Contagious; hand hygiene', 'Replace eye makeup'],
    codingSuggestions: ['H10.029 Other mucopurulent conjunctivitis'],
    referralCriteria: ['Corneal infiltrate / decreased VA → urgent referral'],
    followUpOptions: ['3-7 days'],
  },
  {
    slug: 'viral-conjunctivitis',
    name: 'Viral conjunctivitis',
    category: 'Anterior segment',
    hpiPrompts: [
      'URI / recent illness?',
      'Watery discharge, follicular response',
      'Bilateral after one-eye onset',
    ],
    examElements: [
      'Follicular reaction, preauricular node',
      'Subepithelial infiltrates (EKC)',
    ],
    assessmentOptions: ['Viral conjunctivitis', 'Suspect adenoviral keratoconjunctivitis'],
    planOptions: [
      'Cold compress, lubricants',
      'Strict isolation hygiene',
      'Steroid only with caution (specialist preferred)',
    ],
    educationPoints: ['Highly contagious 10-14 days', 'No school/work if active'],
    codingSuggestions: ['B30.9 Viral conjunctivitis, unspecified'],
    referralCriteria: ['SEI w/ decreased VA → cornea specialist'],
    followUpOptions: ['1 week', '2 weeks'],
  },
  {
    slug: 'blepharitis',
    name: 'Blepharitis',
    category: 'Anterior segment',
    hpiPrompts: [
      'Crusting upon waking?',
      'Itching, burning, foreign-body sensation',
      'Recurrent styes / chalazion',
    ],
    examElements: [
      'Lid margin telangiectasia + collarettes',
      'Meibomian gland expressibility',
      'Demodex screening',
    ],
    assessmentOptions: [
      'Anterior blepharitis',
      'Posterior blepharitis / MGD',
      'Demodex blepharitis',
    ],
    planOptions: [
      'Lid hygiene wipes / tea tree',
      'Warm compress',
      'Lotilaner candidate (Demodex)',
      'Omega-3',
    ],
    educationPoints: ['Chronic management mindset', 'Daily lid hygiene'],
    codingSuggestions: ['H01.001 Blepharitis, right upper eyelid (illustrative)'],
    referralCriteria: ['Atypical lid lesion → biopsy / oculoplastics'],
    followUpOptions: ['4 weeks', '12 weeks'],
  },
  {
    slug: 'mgd',
    name: 'Meibomian gland dysfunction',
    category: 'Anterior segment',
    hpiPrompts: [
      'Burning, fluctuating vision',
      'Worse end-of-day',
      'Prior thermal procedures?',
    ],
    examElements: [
      'Meibomian gland expression',
      'Lid margin telangiectasia',
      'Lipid layer / interferometry if available',
    ],
    assessmentOptions: ['Meibomian gland dysfunction'],
    planOptions: [
      'Warm compress + lid massage',
      'In-office thermal pulsation',
      'Omega-3',
      'Topical anti-inflammatory if indicated',
    ],
    educationPoints: ['Chronic condition', 'Diet + hydration'],
    codingSuggestions: ['H02.88 Other specified disorders of eyelid'],
    referralCriteria: ['Severe gland dropout → dry eye specialist'],
    followUpOptions: ['4 weeks', '12 weeks'],
  },
  {
    slug: 'diabetic-eye-exam',
    name: 'Diabetic eye exam',
    category: 'Posterior segment',
    hpiPrompts: [
      'Type 1 / Type 2; A1C / control',
      'Insulin / oral hypoglycemics',
      'Vision changes, floaters?',
    ],
    examElements: [
      'BCVA + IOP',
      'Anterior segment',
      'Dilated fundus exam',
      'OCT macula (DME screening)',
    ],
    assessmentOptions: [
      'Diabetes without retinopathy',
      'Mild NPDR',
      'Moderate NPDR',
      'Severe NPDR',
      'PDR',
      'CSME / DME present',
    ],
    planOptions: [
      'Annual dilated exam',
      'Refer to retina specialist',
      'Patient handoff to PCP for systemic control',
    ],
    educationPoints: [
      'Glycemic + blood pressure control matters',
      'Floaters / sudden vision loss = call now',
    ],
    codingSuggestions: [
      'E11.319 Type 2 DM without retinopathy',
      'E11.359 Type 2 DM with proliferative retinopathy',
    ],
    referralCriteria: ['Any retinopathy beyond mild NPDR + DME → retina specialist'],
    followUpOptions: ['6 months', '12 months'],
  },
  {
    slug: 'htn-retinopathy-screening',
    name: 'Hypertensive retinopathy screening',
    category: 'Posterior segment',
    hpiPrompts: ['BP control + meds', 'Last PCP visit', 'Visual symptoms'],
    examElements: [
      'Dilated fundus exam',
      'Arteriovenous crossings, retinal hemorrhages, exudates',
      'Optic nerve assessment',
    ],
    assessmentOptions: [
      'No hypertensive retinopathy',
      'Mild HTN retinopathy',
      'Moderate / severe HTN retinopathy',
    ],
    planOptions: ['Coordinate with PCP', 'Routine vs. accelerated follow-up'],
    educationPoints: ['BP control protects vision', 'Watch for sudden vision changes'],
    codingSuggestions: ['H35.039 Hypertensive retinopathy, bilateral (illustrative)'],
    referralCriteria: ['Disc edema → urgent ophthalmology'],
    followUpOptions: ['3 months', '6 months', '12 months'],
  },
  {
    slug: 'glaucoma-suspect',
    name: 'Glaucoma suspect',
    category: 'Posterior segment',
    hpiPrompts: [
      'Family history of glaucoma',
      'Steroid use',
      'Refractive status (myopia / hyperopia)',
    ],
    examElements: [
      'IOP + CCT',
      'Disc evaluation (CDR)',
      'OCT RNFL + ganglion cell',
      'Visual field (24-2 / 30-2)',
      'Gonioscopy',
    ],
    assessmentOptions: [
      'Glaucoma suspect, disc',
      'Glaucoma suspect, elevated IOP (ocular hypertension)',
      'Glaucoma suspect, family history',
    ],
    planOptions: [
      'Repeat baseline imaging',
      'Initiate therapy if risk-stratified',
      'Educate on risk factors',
    ],
    educationPoints: ['Glaucoma is silent', 'Adherence matters'],
    codingSuggestions: ['H40.001 Preglaucoma, unspecified (illustrative)'],
    referralCriteria: ['Progressive damage despite therapy → glaucoma specialist'],
    followUpOptions: ['3 months', '6 months', '12 months'],
  },
  {
    slug: 'ocular-hypertension',
    name: 'Ocular hypertension',
    category: 'Posterior segment',
    hpiPrompts: ['Documented elevated IOP', 'Steroid use', 'Family history'],
    examElements: [
      'Repeat IOP + CCT',
      'OCT RNFL baseline',
      'VF baseline',
      'Gonioscopy',
    ],
    assessmentOptions: ['Ocular hypertension'],
    planOptions: [
      'Risk-stratified observation',
      'Initiate therapy per OHTS criteria',
    ],
    educationPoints: ['Risk vs benefit of starting therapy'],
    codingSuggestions: ['H40.05X1 Ocular hypertension, mild stage'],
    referralCriteria: ['Conversion to glaucoma → consult'],
    followUpOptions: ['3 months', '6 months'],
  },
  {
    slug: 'cataract-evaluation',
    name: 'Cataract evaluation',
    category: 'Refractive',
    hpiPrompts: [
      'Functional vision complaints',
      'Glare / halos at night',
      'Driving concerns',
    ],
    examElements: [
      'BCVA + brightness acuity',
      'Slit-lamp lens grading',
      'Posterior segment to rule out comorbidity',
    ],
    assessmentOptions: [
      'Visually significant cataract',
      'Cataract not visually significant',
    ],
    planOptions: [
      'Comanage with cataract surgeon',
      'Update Rx; continue monitoring',
      'Patient education on surgical options',
    ],
    educationPoints: ['Outpatient procedure', 'IOL options discussion'],
    codingSuggestions: ['H25.13 Age-related nuclear cataract, bilateral'],
    referralCriteria: ['Visually significant cataract → cataract surgeon'],
    followUpOptions: ['Per surgeon', 'Annual'],
  },
  {
    slug: 'pvd-floaters',
    name: 'Floaters / posterior vitreous detachment concern',
    category: 'Emergency / urgent',
    hpiPrompts: [
      'Sudden onset floaters / flashes?',
      'Curtain / shadow / decreased vision?',
      'Trauma / prior PVD / surgery?',
    ],
    examElements: [
      'Dilated fundus exam, peripheral retina',
      'Scleral depression if needed',
      'OCT if macular involvement',
    ],
    assessmentOptions: [
      'Acute symptomatic PVD',
      'No retinal break identified',
      'Suspected retinal tear / detachment',
    ],
    planOptions: [
      'Reassurance + return precautions',
      'Same-day retina referral if break / detachment',
    ],
    educationPoints: [
      'Curtain / new floaters / flashes = immediate care',
      'Risk window first 6 weeks',
    ],
    codingSuggestions: ['H43.811 Vitreous degeneration, right eye (illustrative)'],
    referralCriteria: ['Retinal break or detachment → urgent retina specialist'],
    followUpOptions: ['1 week', '4 weeks', '8 weeks'],
  },
  {
    slug: 'red-eye-evaluation',
    name: 'Red eye evaluation',
    category: 'Anterior segment',
    hpiPrompts: [
      'Onset, pain, photophobia, discharge',
      'Trauma, CL wear, prior episodes',
      'Vision change?',
    ],
    examElements: [
      'Slit-lamp full anterior segment',
      'Fluorescein staining',
      'IOP if appropriate',
    ],
    assessmentOptions: [
      'Bacterial conjunctivitis',
      'Viral conjunctivitis',
      'Allergic conjunctivitis',
      'Subconjunctival hemorrhage',
      'Episcleritis / scleritis',
      'Uveitis',
      'Keratitis',
    ],
    planOptions: ['Targeted therapy', 'Cycloplegia if uveitis'],
    educationPoints: ['Hand hygiene', 'Avoid CL wear during active disease'],
    codingSuggestions: ['Code per final diagnosis'],
    referralCriteria: ['Hypopyon / decreased VA / corneal infiltrate → urgent'],
    followUpOptions: ['24-48h', '1 week'],
  },
  {
    slug: 'eye-pain-evaluation',
    name: 'Eye pain evaluation',
    category: 'Emergency / urgent',
    hpiPrompts: [
      'Onset, severity, character',
      'Photophobia, vision loss',
      'Headache, nausea',
    ],
    examElements: [
      'BCVA + pupils + EOM',
      'Slit-lamp + IOP',
      'Dilated fundus',
    ],
    assessmentOptions: [
      'Corneal abrasion',
      'Acute angle closure suspect',
      'Uveitis',
      'Migraine / referred pain',
    ],
    planOptions: ['Targeted therapy', 'Immediate transfer if angle closure suspected'],
    educationPoints: ['When to call now'],
    codingSuggestions: ['Code per final diagnosis'],
    referralCriteria: ['Angle closure → ER / ophthalmology now'],
    followUpOptions: ['24h', '1 week'],
  },
  {
    slug: 'corneal-abrasion',
    name: 'Corneal abrasion',
    category: 'Anterior segment',
    hpiPrompts: [
      'Mechanism of injury',
      'CL wear / metallic / vegetative',
      'Tetanus status',
    ],
    examElements: [
      'Fluorescein with cobalt-blue light',
      'Lid eversion (rule out foreign body)',
      'Seidel test if open globe suspected',
    ],
    assessmentOptions: ['Corneal abrasion, no infectious infiltrate'],
    planOptions: [
      'Topical antibiotic (non-CL)',
      'Topical fluoroquinolone (CL-related)',
      'Pain control without topical anesthetic',
      'No patching',
    ],
    educationPoints: ['Eye protection', 'Return immediately for worsening'],
    codingSuggestions: ['S05.00XA Injury of conjunctiva and corneal abrasion'],
    referralCriteria: ['Open globe suspicion → ER'],
    followUpOptions: ['24h', '48-72h'],
  },
  {
    slug: 'keratoconus-screening',
    name: 'Keratoconus screening',
    category: 'Refractive',
    hpiPrompts: [
      'Frequent Rx changes',
      'Eye rubbing, atopy, family history',
      'Vision quality with current correction',
    ],
    examElements: [
      'Topography / tomography',
      'Pachymetry',
      'Slit-lamp (Vogt striae, Fleischer ring)',
    ],
    assessmentOptions: [
      'Keratoconus suspect',
      'Forme fruste keratoconus',
      'Keratoconus, confirmed',
    ],
    planOptions: [
      'Discontinue eye rubbing',
      'Cross-linking candidate evaluation',
      'Scleral / specialty CL fit',
    ],
    educationPoints: ['Avoid rubbing', 'Specialty CLs vs surgery'],
    codingSuggestions: ['H18.621 Keratoconus, stable, right eye'],
    referralCriteria: ['Documented progression → cornea specialist for CXL'],
    followUpOptions: ['3 months', '6 months'],
  },
  {
    slug: 'amd-screening',
    name: 'Macular degeneration screening',
    category: 'Posterior segment',
    hpiPrompts: [
      'Distortion (Amsler) / central vision change',
      'Family history',
      'Smoking, diet',
    ],
    examElements: [
      'BCVA + Amsler grid',
      'Dilated fundus + OCT macula',
      'FAF if available',
    ],
    assessmentOptions: [
      'Early dry AMD',
      'Intermediate dry AMD',
      'Geographic atrophy',
      'Suspected neovascular AMD',
    ],
    planOptions: [
      'AREDS2 supplementation discussion',
      'Smoking cessation',
      'Routine vs. urgent retina referral',
    ],
    educationPoints: ['Self-monitoring with Amsler', 'Diet + lifestyle'],
    codingSuggestions: ['H35.31 Nonexudative AMD'],
    referralCriteria: ['Suspected wet AMD → urgent retina specialist'],
    followUpOptions: ['3 months', '6 months', '12 months'],
  },
  {
    slug: 'retinal-finding-referral',
    name: 'Retinal finding referral',
    category: 'Neuro / referral',
    hpiPrompts: ['Symptoms', 'Comorbidities', 'Prior retina history'],
    examElements: [
      'Dilated fundus exam with documentation',
      'OCT / FAF / FA if available',
    ],
    assessmentOptions: ['Specific retinal finding requiring specialist input'],
    planOptions: ['Referral letter generated', 'Patient educated on urgency'],
    educationPoints: ['Importance of timely follow-up'],
    codingSuggestions: ['Code per specific finding'],
    referralCriteria: ['Time-sensitive findings → urgent referral'],
    followUpOptions: ['Per specialist'],
  },
  {
    slug: 'headache-visual-strain',
    name: 'Headache / visual strain',
    category: 'Neuro / referral',
    hpiPrompts: [
      'Pattern, triggers, duration',
      'Migraine history / aura',
      'Worse with reading / screens',
    ],
    examElements: [
      'BCVA + refraction',
      'Binocular function / NPC / vergences',
      'Dilated fundus to rule out papilledema',
    ],
    assessmentOptions: [
      'Refractive / accommodative origin',
      'Binocular vision disorder',
      'Suspected migraine, primary care input',
    ],
    planOptions: [
      'Updated Rx / computer Rx',
      'Vision therapy candidate',
      'PCP / neurology coordination',
    ],
    educationPoints: ['20-20-20 rule', 'Workspace ergonomics'],
    codingSuggestions: ['Code per primary contributor'],
    referralCriteria: ['Red flags (papilledema, neuro deficit) → ER'],
    followUpOptions: ['4 weeks', '12 weeks'],
  },
  {
    slug: 'digital-eye-strain',
    name: 'Digital eye strain',
    category: 'Lifestyle / digital',
    hpiPrompts: [
      'Daily screen hours',
      'Workstation setup',
      'Blink rate / breaks',
    ],
    examElements: [
      'Manifest refraction (computer distance)',
      'Tear film evaluation',
      'Binocular vision',
    ],
    assessmentOptions: [
      'Digital eye strain',
      'Mild dry eye contribution',
      'Uncorrected refractive error',
    ],
    planOptions: [
      'Computer-specific Rx',
      'Lubricants',
      '20-20-20 + ergonomics',
    ],
    educationPoints: ['Screen ergonomics', 'Lighting + breaks'],
    codingSuggestions: ['H53.149 Visual discomfort, unspecified'],
    referralCriteria: ['Persistent symptoms after intervention'],
    followUpOptions: ['4 weeks', '12 weeks'],
  },
];

export function getTemplateBySlug(slug: string): StarterTemplate | undefined {
  return STARTER_DISEASE_TEMPLATES.find((t) => t.slug === slug);
}

export const TEMPLATE_CATEGORIES = Array.from(
  new Set(STARTER_DISEASE_TEMPLATES.map((t) => t.category)),
);
