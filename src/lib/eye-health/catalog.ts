/**
 * Eye Health Library — EyeQ-authored educational summaries.
 * Educational only. Not a diagnosis. Provider-reviewed drafts for demo.
 * Source links point to public organizational pages; content is original paraphrase.
 */

export const EYE_HEALTH_DISCLAIMER =
  'This information is for education only and is not a diagnosis. Your eye care provider will explain what applies to your specific eyes, exam results, and treatment plan.';

export const EYE_HEALTH_URGENT_WARNING =
  'If you have sudden vision loss, severe eye pain, new flashes or floaters, a curtain/shadow over your vision, chemical exposure, or eye trauma, contact an eye care provider immediately or seek urgent/emergency care.';

export type EyeHealthCategoryId =
  | 'refractive-errors'
  | 'contact-lens-care'
  | 'dry-eye'
  | 'allergies-irritation'
  | 'infections-inflammation'
  | 'glaucoma-pressure'
  | 'retina-diabetes'
  | 'macula-aging'
  | 'cataracts'
  | 'pediatric-myopia'
  | 'injuries-urgent'
  | 'eyelid-surface'
  | 'surgery-referral'
  | 'prevention-wellness';

export const EYE_HEALTH_CATEGORIES: {
  id: EyeHealthCategoryId;
  label: string;
  description: string;
}[] = [
  { id: 'refractive-errors', label: 'Refractive errors', description: 'Nearsightedness, farsightedness, astigmatism, and related topics.' },
  { id: 'contact-lens-care', label: 'Contact lens care', description: 'Hygiene, comfort, and safe wear habits.' },
  { id: 'dry-eye', label: 'Dry eye', description: 'Comfort, tear film, and everyday care topics.' },
  { id: 'allergies-irritation', label: 'Allergies and irritation', description: 'Itchy, watery, or irritated eyes.' },
  { id: 'infections-inflammation', label: 'Infections and inflammation', description: 'Pink eye and related surface inflammation education.' },
  { id: 'glaucoma-pressure', label: 'Eye pressure and glaucoma-related education', description: 'Pressure monitoring and optic nerve health education.' },
  { id: 'retina-diabetes', label: 'Retina and diabetes-related eye health', description: 'Diabetic eye exams and retina health basics.' },
  { id: 'macula-aging', label: 'Macula and aging-related vision changes', description: 'Macular health and age-related changes.' },
  { id: 'cataracts', label: 'Cataracts', description: 'Cloudy lens changes and related education.' },
  { id: 'pediatric-myopia', label: 'Pediatric and myopia control', description: 'Children’s vision and myopia education.' },
  { id: 'injuries-urgent', label: 'Eye injuries and urgent symptoms', description: 'Warning signs that need prompt care.' },
  { id: 'eyelid-surface', label: 'Eyelid and surface conditions', description: 'Blepharitis and eyelid hygiene topics.' },
  { id: 'surgery-referral', label: 'Surgery and referral education', description: 'What referrals and procedures may involve.' },
  { id: 'prevention-wellness', label: 'General prevention and eye wellness', description: 'Everyday habits that support eye comfort.' },
];

export type EyeHealthCatalogReviewStatus = 'draft' | 'provider_reviewed' | 'practice_approved';

export type EyeHealthArticle = {
  title: string;
  slug: string;
  category: EyeHealthCategoryId;
  plainLanguageSummary: string;
  whatItMeans: string;
  commonSymptoms: string[];
  possibleCausesOrRiskFactors: string[];
  preventionAndMaintenance: string[];
  treatmentOverview: string[];
  whatYourProviderMayCheck: string[];
  questionsToAskProvider: string[];
  whenToContactOffice: string[];
  urgentWarningSigns: string[];
  patientFriendlyDisclaimer: string;
  sourceLinks: { label: string; url: string }[];
  /** Catalog default before org approval overrides */
  reviewStatus: EyeHealthCatalogReviewStatus;
  lastReviewedAt: string | null;
  reviewedBy: string | null;
  tags: string[];
  searchTerms: string[];
  isDemoContent: boolean;
  showUrgentBanner: boolean;
};

function article(
  partial: Omit<EyeHealthArticle, 'patientFriendlyDisclaimer' | 'isDemoContent'> & {
    isDemoContent?: boolean;
  },
): EyeHealthArticle {
  return {
    patientFriendlyDisclaimer: EYE_HEALTH_DISCLAIMER,
    isDemoContent: partial.isDemoContent ?? true,
    ...partial,
  };
}

export const EYE_HEALTH_ARTICLES: EyeHealthArticle[] = [
  article({
    title: 'Dry Eye',
    slug: 'dry-eye',
    category: 'dry-eye',
    plainLanguageSummary:
      'Dry eye is a common comfort problem that happens when tears are low in amount or quality. Your provider can explain what applies to your eyes.',
    whatItMeans:
      'Your tear film helps keep the surface of the eye smooth and comfortable. When it is not working well, eyes may feel dry, gritty, or tired.',
    commonSymptoms: ['Burning or stinging', 'Gritty feeling', 'Watery eyes (reflex tearing)', 'Blur that improves with blinking', 'Discomfort with screens'],
    possibleCausesOrRiskFactors: ['Screen time with less blinking', 'Age-related tear changes', 'Contact lens wear', 'Certain medications', 'Environmental dryness', 'Eyelid oil gland issues'],
    preventionAndMaintenance: [
      'Take regular screen breaks (look far away every 20 minutes)',
      'Blink fully and often during near work',
      'Ask your provider before starting any drop routine',
      'Stay hydrated and consider a humidifier in dry rooms',
      'Follow any lid hygiene plan your provider recommends',
      'Keep routine eye exams as instructed',
    ],
    treatmentOverview: [
      'Treatment depends on your exam findings',
      'Options may include lubricating drops, prescription drops, lid hygiene, in-office procedures, or monitoring',
      'Your provider will decide what is appropriate for you',
    ],
    whatYourProviderMayCheck: ['Tear quality and quantity', 'Eyelid margins and oil glands', 'Corneal surface staining', 'Contact lens fit and wear schedule'],
    questionsToAskProvider: [
      'What type of dry eye do I have?',
      'Which drops are safe for me to use?',
      'How often should I return for follow-up?',
      'Do my medications or contacts contribute?',
    ],
    whenToContactOffice: ['Symptoms worsen despite your recommended plan', 'New light sensitivity', 'Redness with discharge', 'Contact lens intolerance that is new'],
    urgentWarningSigns: ['Sudden vision loss', 'Severe eye pain', 'New flashes, floaters, or a curtain over vision'],
    sourceLinks: [
      { label: 'National Eye Institute — Dry Eye', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/dry-eye' },
      { label: 'American Optometric Association — Dry Eye', url: 'https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/dry-eye' },
    ],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['dry eye', 'tears', 'comfort', 'screens'],
    searchTerms: ['dry eyes', 'gritty', 'burning', 'artificial tears', 'screen', 'tear film'],
    showUrgentBanner: false,
  }),
  article({
    title: 'Myopia (Nearsightedness)',
    slug: 'myopia',
    category: 'refractive-errors',
    plainLanguageSummary:
      'Myopia means distant objects look blurrier than near objects. Glasses, contacts, or other options may help depending on your exam.',
    whatItMeans:
      'Light focuses in front of the retina instead of on it, so distance vision is blurred. It is a refractive error, not an eye infection.',
    commonSymptoms: ['Distance blur', 'Squinting', 'Eye strain with distance tasks', 'Headaches after visual effort'],
    possibleCausesOrRiskFactors: ['Family history', 'Extended near work', 'Childhood onset', 'Less outdoor time in some studies'],
    preventionAndMaintenance: [
      'Keep recommended exam schedules, especially for children',
      'Balance near work with outdoor time when appropriate',
      'Wear the correction your provider recommends for driving and school',
      'Discuss myopia control options only with your provider',
    ],
    treatmentOverview: [
      'Common options include glasses and contact lenses',
      'Some patients may discuss specialty lenses or other approaches with their provider',
      'Surgery is not appropriate for everyone and requires a separate evaluation',
    ],
    whatYourProviderMayCheck: ['Visual acuity', 'Refraction', 'Eye health exam', 'Growth of prescription over time'],
    questionsToAskProvider: ['How fast is my prescription changing?', 'Are contacts an option for me?', 'What should my child do for school vision?'],
    whenToContactOffice: ['Sudden change in vision', 'Frequent headaches with glasses', 'Child struggling in school after recent Rx'],
    urgentWarningSigns: ['Sudden vision loss', 'New flashes or floaters', 'Curtain over vision'],
    sourceLinks: [
      { label: 'NEI — Refractive Errors', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/refractive-errors' },
    ],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['myopia', 'nearsighted', 'glasses', 'contacts'],
    searchTerms: ['nearsightedness', 'blurry distance', 'myopia control', 'glasses'],
    showUrgentBanner: false,
  }),
  article({
    title: 'Astigmatism',
    slug: 'astigmatism',
    category: 'refractive-errors',
    plainLanguageSummary:
      'Astigmatism is a common focusing difference that can blur vision at distance and near. Many people correct it with glasses or contacts.',
    whatItMeans:
      'The cornea or lens has uneven curvature, so light focuses unevenly. It often occurs with myopia or hyperopia.',
    commonSymptoms: ['Blur or ghosting', 'Eye strain', 'Squinting', 'Headaches with visual tasks'],
    possibleCausesOrRiskFactors: ['Natural corneal shape', 'Family history', 'Eye injury or surgery history (discuss with provider)'],
    preventionAndMaintenance: ['Wear the Rx your provider recommends', 'Update lenses when vision changes', 'Routine exams'],
    treatmentOverview: [
      'Glasses and toric contact lenses are common options',
      'Some refractive procedures may be discussed after a full evaluation',
      'Your provider will explain what fits your eyes and lifestyle',
    ],
    whatYourProviderMayCheck: ['Refraction', 'Corneal shape/topography when indicated', 'Overall eye health'],
    questionsToAskProvider: ['Can contacts correct my astigmatism?', 'How often should I update my Rx?'],
    whenToContactOffice: ['Sudden blur change', 'New double vision', 'Contact lens discomfort'],
    urgentWarningSigns: ['Sudden vision loss', 'Severe pain', 'Trauma'],
    sourceLinks: [{ label: 'NEI — Refractive Errors', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/refractive-errors' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['astigmatism', 'blur', 'toric'],
    searchTerms: ['astigmatism', 'ghosting', 'blurry vision', 'toric contacts'],
    showUrgentBanner: false,
  }),
  article({
    title: 'Cataracts',
    slug: 'cataracts',
    category: 'cataracts',
    plainLanguageSummary:
      'A cataract is clouding of the eye’s natural lens. It can make vision look cloudy or glare-sensitive. Your provider confirms whether it is present and what to do next.',
    whatItMeans:
      'The lens helps focus light. When it becomes cloudy, vision may gradually decline. Cataracts are common with aging.',
    commonSymptoms: ['Cloudy or dull vision', 'Glare or halos at night', 'Colors looking faded', 'Frequent Rx changes'],
    possibleCausesOrRiskFactors: ['Aging', 'Smoking', 'UV exposure', 'Diabetes', 'Prior eye injury or steroid use'],
    preventionAndMaintenance: ['UV-protective sunglasses', 'Routine exams', 'Do not smoke', 'Manage diabetes with your care team'],
    treatmentOverview: [
      'Early stages may be managed with updated glasses and monitoring',
      'Surgery may be discussed when vision affects daily life',
      'Only your provider can decide if and when surgery is appropriate',
    ],
    whatYourProviderMayCheck: ['Visual acuity', 'Dilated lens exam', 'Glare testing when indicated'],
    questionsToAskProvider: ['How advanced is my cataract?', 'When should we discuss surgery?', 'What recovery looks like if surgery is planned?'],
    whenToContactOffice: ['Rapid vision decline', 'New glare affecting driving safety'],
    urgentWarningSigns: ['Sudden vision loss', 'Severe pain', 'Flashes/floaters with curtain'],
    sourceLinks: [{ label: 'NEI — Cataracts', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/cataracts' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['cataract', 'lens', 'glare'],
    searchTerms: ['cataract', 'cloudy vision', 'glare', 'halos'],
    showUrgentBanner: false,
  }),
  article({
    title: 'Glaucoma Overview',
    slug: 'glaucoma-overview',
    category: 'glaucoma-pressure',
    plainLanguageSummary:
      'Glaucoma is a group of eye conditions that can damage the optic nerve, often related to eye pressure. Early stages may have no symptoms. Only an exam can assess your risk.',
    whatItMeans:
      'The optic nerve carries visual information to the brain. Glaucoma education helps patients understand why monitoring and adherence matter if a provider diagnoses or monitors glaucoma.',
    commonSymptoms: ['Often none early', 'Peripheral vision loss in advanced disease', 'Eye pain/halos in some acute forms (urgent)'],
    possibleCausesOrRiskFactors: ['Elevated eye pressure', 'Family history', 'Age', 'Certain ethnic backgrounds', 'Thin corneas', 'Prior eye trauma'],
    preventionAndMaintenance: [
      'Keep eye exam appointments',
      'If prescribed drops, use them exactly as directed by your provider',
      'Bring bottles to visits',
      'Do not stop medication without talking to your provider',
    ],
    treatmentOverview: [
      'May include prescription drops, laser procedures, surgery, or monitoring',
      'Choice depends on type, severity, and your overall eye health',
      'This page does not prescribe treatment',
    ],
    whatYourProviderMayCheck: ['Eye pressure (IOP)', 'Optic nerve exam', 'Visual fields', 'OCT/RNFL imaging when indicated'],
    questionsToAskProvider: ['What is my pressure target?', 'How often do I need fields or OCT?', 'What happens if I miss a drop?'],
    whenToContactOffice: ['Missed medication for several days', 'New vision changes', 'Side effects from drops'],
    urgentWarningSigns: ['Sudden severe eye pain', 'Nausea with eye pain', 'Sudden vision loss', 'Halos with red painful eye'],
    sourceLinks: [
      { label: 'NEI — Glaucoma', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/glaucoma' },
      { label: 'AOA — Glaucoma', url: 'https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/glaucoma' },
    ],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['glaucoma', 'IOP', 'optic nerve', 'OCT'],
    searchTerms: ['glaucoma', 'high eye pressure', 'IOP', 'OCT', 'RNFL', 'visual field'],
    showUrgentBanner: true,
  }),
  article({
    title: 'Diabetic Eye Exam',
    slug: 'diabetic-eye-exam',
    category: 'retina-diabetes',
    plainLanguageSummary:
      'Diabetes can affect the blood vessels of the retina. Dilated diabetic eye exams help find changes early, even when vision still feels fine.',
    whatItMeans:
      'High blood sugar can damage tiny retinal vessels over time. Screening is about prevention and early detection, not a diagnosis by itself.',
    commonSymptoms: ['Often none early', 'Blur', 'Floaters', 'Difficulty seeing at night (later stages)'],
    possibleCausesOrRiskFactors: ['Type 1 or Type 2 diabetes', 'Longer duration of diabetes', 'Higher A1C', 'High blood pressure', 'Pregnancy with diabetes'],
    preventionAndMaintenance: [
      'Keep recommended dilated exam schedule',
      'Work with your medical team on blood sugar, blood pressure, and cholesterol',
      'Do not wait for symptoms',
      'Bring your medication list to visits',
    ],
    treatmentOverview: [
      'Findings may lead to monitoring, imaging, medical treatment, or ophthalmology referral',
      'Your eye care and medical teams coordinate care',
      'This article does not diagnose retinopathy',
    ],
    whatYourProviderMayCheck: ['Dilated retina exam', 'Visual acuity', 'Imaging such as fundus photos or OCT when indicated'],
    questionsToAskProvider: ['How often should I have a dilated exam?', 'Do I need retinal photos?', 'What A1C goal supports eye health?'],
    whenToContactOffice: ['New floaters or blur', 'Missed annual exam', 'Pregnancy with diabetes'],
    urgentWarningSigns: ['Sudden vision loss', 'Curtain over vision', 'Many new floaters with flashes'],
    sourceLinks: [
      { label: 'NEI — Diabetic Eye Disease', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/diabetic-retinopathy' },
      { label: 'CDC — Diabetes and Vision', url: 'https://www.cdc.gov/diabetes/diabetes-complications/diabetes-and-vision-loss.html' },
    ],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['diabetes', 'retina', 'dilated exam'],
    searchTerms: ['diabetic eye exam', 'diabetes', 'retinopathy', 'A1C', 'dilated'],
    showUrgentBanner: true,
  }),
  article({
    title: 'Macular Degeneration Overview',
    slug: 'macular-degeneration-overview',
    category: 'macula-aging',
    plainLanguageSummary:
      'Age-related macular degeneration (AMD) affects central detailed vision. Education helps you understand monitoring and lifestyle topics your provider may discuss.',
    whatItMeans:
      'The macula is the central part of the retina used for reading and faces. AMD can be dry or wet forms; your provider determines what applies to you.',
    commonSymptoms: ['Central blur or distortion', 'Trouble reading fine print', 'Need for brighter light', 'Straight lines looking wavy'],
    possibleCausesOrRiskFactors: ['Age', 'Smoking', 'Family history', 'UV exposure', 'Certain nutritional factors'],
    preventionAndMaintenance: [
      'Do not smoke',
      'Eat a balanced diet as advised by your care team',
      'UV protection',
      'Use an Amsler grid only if your provider recommends it',
      'Keep monitoring visits',
    ],
    treatmentOverview: [
      'Dry AMD may involve monitoring and nutritional discussion',
      'Wet AMD may involve specialty treatments after confirmation',
      'Only a provider can recommend a plan after examining you',
    ],
    whatYourProviderMayCheck: ['Dilated macula exam', 'OCT imaging', 'Amsler testing when indicated'],
    questionsToAskProvider: ['Is my AMD dry or wet?', 'How often do I need OCT?', 'What lifestyle steps matter most for me?'],
    whenToContactOffice: ['New distortion', 'Sudden central blur', 'Amsler changes if you were asked to monitor'],
    urgentWarningSigns: ['Sudden central vision loss', 'New distortion that appears quickly'],
    sourceLinks: [{ label: 'NEI — AMD', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/age-related-macular-degeneration' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['AMD', 'macula', 'aging'],
    searchTerms: ['macular degeneration', 'AMD', 'central vision', 'Amsler'],
    showUrgentBanner: true,
  }),
  article({
    title: 'Floaters and Flashes',
    slug: 'floaters-and-flashes',
    category: 'injuries-urgent',
    plainLanguageSummary:
      'Floaters are spots or cobwebs that drift in vision. Flashes are brief light streaks. New or sudden changes need prompt evaluation to rule out retinal problems.',
    whatItMeans:
      'Floaters often come from vitreous changes. Most are not emergencies, but a sudden shower of floaters, flashes, or a curtain of vision loss can signal a retinal tear or detachment.',
    commonSymptoms: ['Dots, strands, or cobwebs', 'Brief flashes of light', 'More noticeable against bright backgrounds'],
    possibleCausesOrRiskFactors: ['Aging vitreous', 'Nearsightedness', 'Prior eye surgery or injury', 'Inflammation'],
    preventionAndMaintenance: ['Know warning signs', 'Keep dilated exams if you are high risk', 'Protect eyes from trauma'],
    treatmentOverview: [
      'Many floaters are monitored after a dilated exam shows no tear',
      'Retinal tears or detachments need urgent specialty care',
      'Do not assume floaters are harmless without an exam',
    ],
    whatYourProviderMayCheck: ['Dilated retina exam', 'Peripheral retina evaluation'],
    questionsToAskProvider: ['Do I need to be seen today?', 'What changes mean I should go to emergency care?'],
    whenToContactOffice: ['New floaters', 'New flashes', 'Increase in floaters'],
    urgentWarningSigns: ['Sudden many new floaters', 'Flashes with curtain/shadow', 'Sudden vision loss', 'Trauma'],
    sourceLinks: [{ label: 'NEI — Floaters', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/floaters' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['floaters', 'flashes', 'retina'],
    searchTerms: ['floaters', 'flashes', 'curtain', 'retinal detachment', 'spots in vision'],
    showUrgentBanner: true,
  }),
  article({
    title: 'Contact Lens Care',
    slug: 'contact-lens-care',
    category: 'contact-lens-care',
    plainLanguageSummary:
      'Healthy contact lens wear depends on clean hands, the right solution, and following your wear schedule. Poor habits raise infection risk.',
    whatItMeans:
      'Contacts sit on the eye’s surface. Hygiene and replacement schedules reduce irritation and infection risk.',
    commonSymptoms: ['Redness', 'Discomfort', 'Discharge', 'Blur that clears after lens removal'],
    possibleCausesOrRiskFactors: ['Overnight wear when not approved', 'Tap water exposure', 'Dirty cases', 'Expired lenses', 'Sleeping in lenses without approval'],
    preventionAndMaintenance: [
      'Wash and dry hands before handling lenses',
      'Use only recommended solutions — never water or saliva',
      'Replace case regularly',
      'Follow daily/biweekly/monthly schedule exactly',
      'Do not wear lenses if eyes are red or painful',
    ],
    treatmentOverview: [
      'If infection is suspected, stop lens wear and contact the office',
      'Your provider may prescribe medication after examining you',
      'This article does not recommend a specific drug or dose',
    ],
    whatYourProviderMayCheck: ['Lens fit', 'Corneal health', 'Wear schedule compliance'],
    questionsToAskProvider: ['What is my replacement schedule?', 'Can I nap in these lenses?', 'Which solution is approved for me?'],
    whenToContactOffice: ['Red painful eye with contacts', 'Sudden blur', 'Light sensitivity'],
    urgentWarningSigns: ['Severe pain', 'Significant vision loss', 'Trauma with lenses in'],
    sourceLinks: [{ label: 'CDC — Contact Lens Hygiene', url: 'https://www.cdc.gov/contact-lenses/about/index.html' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['contacts', 'hygiene', 'infection'],
    searchTerms: ['contact lens infection', 'contact lens care', 'red eye contacts', 'solution'],
    showUrgentBanner: true,
  }),
  article({
    title: 'Eye Allergies',
    slug: 'eye-allergies',
    category: 'allergies-irritation',
    plainLanguageSummary:
      'Allergic eye irritation often causes itching, watering, and puffiness. Your provider can help separate allergies from infection or dry eye.',
    whatItMeans:
      'Allergens can trigger histamine responses in the conjunctiva. Rubbing often makes symptoms worse.',
    commonSymptoms: ['Itching', 'Watering', 'Redness', 'Puffy lids', 'Seasonal flares'],
    possibleCausesOrRiskFactors: ['Pollen', 'Dust', 'Pet dander', 'Contact lens wear', 'Cosmetics'],
    preventionAndMaintenance: ['Avoid rubbing', 'Cool compresses if recommended', 'Allergen reduction at home', 'Ask before using over-the-counter allergy drops'],
    treatmentOverview: [
      'May include avoidance, lubricating drops, or prescription allergy drops after evaluation',
      'Do not share eye drops',
      'Your provider chooses what is safe for you',
    ],
    whatYourProviderMayCheck: ['Conjunctiva and lids', 'Cornea', 'History of seasonal patterns'],
    questionsToAskProvider: ['Is this allergy or infection?', 'Which drops are safe with my contacts?'],
    whenToContactOffice: ['Symptoms lasting despite care', 'Vision change', 'Thick discharge'],
    urgentWarningSigns: ['Severe pain', 'Sudden vision loss', 'Chemical exposure'],
    sourceLinks: [{ label: 'AOA — Allergic Conjunctivitis', url: 'https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/allergic-conjunctivitis' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['allergy', 'itch', 'seasonal'],
    searchTerms: ['eye allergies', 'itchy eyes', 'pollen', 'watery eyes'],
    showUrgentBanner: false,
  }),
  article({
    title: 'Pink Eye (Conjunctivitis)',
    slug: 'pink-eye-conjunctivitis',
    category: 'infections-inflammation',
    plainLanguageSummary:
      'Pink eye means inflammation of the conjunctiva. Causes include viruses, bacteria, allergies, and irritation. An exam helps identify the likely type.',
    whatItMeans:
      'The white of the eye and inner lids can look red or pink. Contagious forms need careful hygiene. This page does not diagnose your case.',
    commonSymptoms: ['Redness', 'Discharge', 'Gritty feeling', 'Crusting on waking', 'Tearing'],
    possibleCausesOrRiskFactors: ['Viral illness', 'Bacterial infection', 'Allergies', 'Contact lens overwear', 'Irritants'],
    preventionAndMaintenance: ['Hand washing', 'Do not share towels or makeup', 'Replace eye cosmetics if advised', 'Stay home if your provider says you are contagious'],
    treatmentOverview: [
      'Viral forms are often supportive care after evaluation',
      'Bacterial forms may need prescription drops if confirmed',
      'Allergic forms are managed differently',
      'Never start leftover eye antibiotics without guidance',
    ],
    whatYourProviderMayCheck: ['Discharge type', 'Corneal involvement', 'Contact lens history', 'Lymph nodes when relevant'],
    questionsToAskProvider: ['Is it contagious?', 'When can I return to work or school?', 'Should I stop contact lenses?'],
    whenToContactOffice: ['Worsening redness', 'Vision blur', 'Light sensitivity', 'Contact lens wear with red eye'],
    urgentWarningSigns: ['Severe pain', 'Significant vision loss', 'Chemical splash'],
    sourceLinks: [{ label: 'CDC — Conjunctivitis', url: 'https://www.cdc.gov/conjunctivitis/about/index.html' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['pink eye', 'conjunctivitis', 'red eye'],
    searchTerms: ['pink eye', 'conjunctivitis', 'red eye', 'discharge'],
    showUrgentBanner: true,
  }),
  article({
    title: 'Blepharitis',
    slug: 'blepharitis',
    category: 'eyelid-surface',
    plainLanguageSummary:
      'Blepharitis is inflammation along the eyelid margins. It can cause crusting, burning, and fluctuating blur. Lid hygiene is often part of long-term care.',
    whatItMeans:
      'Oil glands and bacteria along the lids can contribute to irritation and tear film problems. It often comes and goes.',
    commonSymptoms: ['Crusty lashes', 'Itchy lids', 'Burning', 'Morning stickiness', 'Fluctuating vision'],
    possibleCausesOrRiskFactors: ['Oil gland dysfunction', 'Skin conditions like rosacea', 'Demodex in some cases', 'Makeup residue'],
    preventionAndMaintenance: ['Follow lid hygiene instructions from your provider', 'Replace eye makeup regularly', 'Avoid heavy liner on the waterline if advised'],
    treatmentOverview: [
      'Often includes warm compresses and lid cleaning as directed',
      'Some patients need prescription therapies after exam',
      'In-office treatments may be discussed for meibomian gland issues',
    ],
    whatYourProviderMayCheck: ['Lid margins', 'Meibomian glands', 'Tear film', 'Lash roots'],
    questionsToAskProvider: ['How often should I clean my lids?', 'Is this related to dry eye?'],
    whenToContactOffice: ['Worsening redness', 'Stye that does not improve', 'Vision change'],
    urgentWarningSigns: ['Severe pain', 'Spreading facial redness with fever'],
    sourceLinks: [{ label: 'NEI — Blepharitis', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/blepharitis' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['blepharitis', 'lids', 'hygiene'],
    searchTerms: ['blepharitis', 'crusty eyelids', 'lid hygiene', 'meibomian'],
    showUrgentBanner: false,
  }),
  article({
    title: 'Computer Vision and Screen Comfort',
    slug: 'computer-vision-syndrome',
    category: 'prevention-wellness',
    plainLanguageSummary:
      'Long screen time can lead to eye strain, dry comfort, and temporary blur. Ergonomics and blink breaks often help. An exam can rule out uncorrected refractive error.',
    whatItMeans:
      'Near focus and reduced blinking during screens stress the focusing system and tear film.',
    commonSymptoms: ['Eye strain', 'Dryness', 'Headache', 'Neck strain', 'Temporary blur after screens'],
    possibleCausesOrRiskFactors: ['Long uninterrupted near work', 'Poor lighting', 'Uncorrected Rx', 'Dry environment'],
    preventionAndMaintenance: [
      '20-20-20 breaks',
      'Screen slightly below eye level',
      'Blink reminders',
      'Good ambient lighting',
      'Update glasses if your provider recommends a computer Rx',
    ],
    treatmentOverview: [
      'May include updated glasses, lubricating drops if appropriate, and habit changes',
      'Your provider will tailor advice after examining you',
    ],
    whatYourProviderMayCheck: ['Refraction', 'Binocular vision', 'Dry eye signs'],
    questionsToAskProvider: ['Do I need computer glasses?', 'Are my symptoms from dry eye?'],
    whenToContactOffice: ['Persistent headaches', 'Double vision', 'Sudden vision change'],
    urgentWarningSigns: ['Sudden vision loss', 'New neurological symptoms with vision change'],
    sourceLinks: [{ label: 'AOA — Computer Vision Syndrome', url: 'https://www.aoa.org/healthy-eyes/eye-and-vision-conditions/computer-vision-syndrome' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['screens', 'strain', 'ergonomics'],
    searchTerms: ['computer vision', 'screen strain', 'eye strain', '20-20-20'],
    showUrgentBanner: false,
  }),
  article({
    title: 'Retinal Detachment Warning Signs',
    slug: 'retinal-detachment-warning-signs',
    category: 'injuries-urgent',
    plainLanguageSummary:
      'A retinal detachment is an emergency. Learn the warning signs so you can seek care quickly. This page cannot diagnose detachment.',
    whatItMeans:
      'The retina can pull away from its normal position. Prompt treatment improves outcomes. Do not wait to “see if it passes.”',
    commonSymptoms: ['Curtain or shadow over vision', 'Sudden shower of floaters', 'Flashes of light', 'Sudden vision loss'],
    possibleCausesOrRiskFactors: ['High myopia', 'Prior eye surgery', 'Trauma', 'Lattice degeneration', 'Family history'],
    preventionAndMaintenance: ['Know your risk factors', 'Protect eyes during sports', 'Seek care immediately for warning signs'],
    treatmentOverview: [
      'Urgent dilated exam is required if warning signs appear',
      'Treatment may include laser, gas bubble procedures, or surgery by a retina specialist',
      'Do not delay care based on internet reading',
    ],
    whatYourProviderMayCheck: ['Dilated peripheral retina exam', 'Urgent referral when indicated'],
    questionsToAskProvider: ['Am I at higher risk?', 'What should I do after hours?'],
    whenToContactOffice: ['Any new flashes/floaters', 'Any curtain symptom — seek urgent care now'],
    urgentWarningSigns: ['Curtain/shadow', 'Sudden many floaters', 'Flashes with vision loss', 'Trauma'],
    sourceLinks: [{ label: 'NEI — Retinal Detachment', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/retinal-detachment' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['retina', 'emergency', 'detachment'],
    searchTerms: ['retinal detachment', 'curtain', 'shadow', 'flashes', 'floaters emergency'],
    showUrgentBanner: true,
  }),
  article({
    title: 'Eye Pressure and OCT/RNFL Testing',
    slug: 'eye-pressure-and-oct-rnfl',
    category: 'glaucoma-pressure',
    plainLanguageSummary:
      'Eye pressure checks and OCT scans of the optic nerve help your provider monitor glaucoma risk. Numbers alone do not diagnose you.',
    whatItMeans:
      'IOP is one risk factor. OCT/RNFL imaging measures nerve fiber layers over time. Your provider interprets trends with your full exam.',
    commonSymptoms: ['Testing itself is usually comfortable', 'No symptoms required to need monitoring'],
    possibleCausesOrRiskFactors: ['Glaucoma suspicion', 'Family history', 'Borderline pressures', 'Optic nerve appearance'],
    preventionAndMaintenance: ['Keep imaging and field appointments', 'Bring prior records if you change practices', 'Use drops as prescribed if you have a treatment plan'],
    treatmentOverview: [
      'Testing guides decisions; it is not a treatment by itself',
      'If treatment is needed, your provider will discuss options separately',
    ],
    whatYourProviderMayCheck: ['IOP', 'OCT RNFL/GCC', 'Visual fields', 'Optic nerve photos'],
    questionsToAskProvider: ['What is my baseline OCT?', 'How often will we repeat testing?', 'What change would lead to treatment?'],
    whenToContactOffice: ['Missed monitoring visit', 'New vision changes while being monitored'],
    urgentWarningSigns: ['Sudden vision loss', 'Severe eye pain'],
    sourceLinks: [{ label: 'NEI — Glaucoma', url: 'https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/glaucoma' }],
    reviewStatus: 'provider_reviewed',
    lastReviewedAt: '2026-07-01',
    reviewedBy: 'EyeQ clinical content (demo)',
    tags: ['OCT', 'IOP', 'RNFL', 'testing'],
    searchTerms: ['eye pressure', 'OCT', 'RNFL', 'optic nerve scan', 'glaucoma test'],
    showUrgentBanner: false,
  }),
];

export type EyeHealthArticleSummary = {
  slug: string;
  title: string;
  category: EyeHealthCategoryId;
  categoryLabel: string;
  plainLanguageSummary: string;
  tags: string[];
  reviewStatus: EyeHealthCatalogReviewStatus;
  isDemoContent: boolean;
  showUrgentBanner: boolean;
};

export function getCategoryLabel(id: EyeHealthCategoryId): string {
  return EYE_HEALTH_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function getEyeHealthArticle(slug: string): EyeHealthArticle | undefined {
  return EYE_HEALTH_ARTICLES.find((a) => a.slug === slug);
}

export function listEyeHealthSummaries(): EyeHealthArticleSummary[] {
  return EYE_HEALTH_ARTICLES.map((a) => ({
    slug: a.slug,
    title: a.title,
    category: a.category,
    categoryLabel: getCategoryLabel(a.category),
    plainLanguageSummary: a.plainLanguageSummary,
    tags: a.tags,
    reviewStatus: a.reviewStatus,
    isDemoContent: a.isDemoContent,
    showUrgentBanner: a.showUrgentBanner,
  }));
}

export function searchEyeHealthArticles(query: string, category?: EyeHealthCategoryId | 'all') {
  const q = query.trim().toLowerCase();
  return listEyeHealthSummaries().filter((a) => {
    if (category && category !== 'all' && a.category !== category) return false;
    if (!q) return true;
    const full = getEyeHealthArticle(a.slug)!;
    const hay = [
      full.title,
      full.plainLanguageSummary,
      full.category,
      ...full.tags,
      ...full.searchTerms,
      ...full.commonSymptoms,
      ...full.preventionAndMaintenance,
      ...full.treatmentOverview,
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q) || q.split(/\s+/).every((token) => hay.includes(token));
  });
}
