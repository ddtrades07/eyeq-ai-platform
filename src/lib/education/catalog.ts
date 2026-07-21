export type EducationLocale = 'en' | 'es' | 'hi' | 'gu' | 'ar' | 'zh' | 'vi';

export type EducationContent = {
  title: string;
  summary: string;
  keyPoints: string[];
  whenToCall: string[];
};

export type EducationTopic = {
  slug: string;
  category: 'Dry eye' | 'Cataract' | 'Glaucoma' | 'Retina' | 'Contacts' | 'Refractive' | 'Pediatric' | 'General';
  audience: 'Patient' | 'Caregiver';
  readingLevel: '6th grade' | '8th grade' | '10th grade';
  translations: Partial<Record<EducationLocale, EducationContent>>;
};

const en = (c: EducationContent): EducationContent => c;

export const EDUCATION_TOPICS: EducationTopic[] = [
  {
    slug: 'dry-eye-basics',
    category: 'Dry eye',
    audience: 'Patient',
    readingLevel: '6th grade',
    translations: {
      en: en({
        title: 'Understanding dry eye',
        summary:
          'Dry eye happens when your eyes do not make enough tears, or the tears are not the right quality.',
        keyPoints: [
          'Use preservative-free artificial tears 4 times per day.',
          'Take a 20-second screen break every 20 minutes.',
          'A warm compress on closed eyes for 5 minutes helps oil glands.',
          'Stay hydrated. Aim for 6-8 glasses of water per day.',
        ],
        whenToCall: [
          'Sudden severe pain.',
          'A new shadow or curtain in your vision.',
          'Light flashes or many new floaters.',
        ],
      }),
      es: {
        title: 'Comprender el ojo seco',
        summary:
          'El ojo seco ocurre cuando los ojos no producen suficientes lágrimas o las lágrimas no son de buena calidad.',
        keyPoints: [
          'Use lágrimas artificiales sin conservantes 4 veces al día.',
          'Tome un descanso de pantalla de 20 segundos cada 20 minutos.',
          'Aplique una compresa tibia sobre los ojos cerrados durante 5 minutos.',
          'Manténgase hidratado. Beba 6-8 vasos de agua al día.',
        ],
        whenToCall: [
          'Dolor repentino e intenso.',
          'Una sombra o cortina nueva en su visión.',
          'Destellos de luz o muchas moscas volantes nuevas.',
        ],
      },
    },
  },
  {
    slug: 'cataract-surgery',
    category: 'Cataract',
    audience: 'Patient',
    readingLevel: '8th grade',
    translations: {
      en: en({
        title: 'Cataract surgery: what to expect',
        summary:
          'Cataract surgery replaces your eye’s cloudy lens with a clear artificial lens. Most patients see better within a few days.',
        keyPoints: [
          'Surgery takes about 15-30 minutes per eye.',
          'You will be awake. The surgeon numbs your eye with drops.',
          'Bring a driver. Plan to rest the day of surgery.',
          'Use the prescribed drops for 4 weeks.',
        ],
        whenToCall: [
          'Severe pain not relieved by acetaminophen.',
          'Sudden loss of vision.',
          'Heavy redness or pus-like discharge.',
        ],
      }),
    },
  },
  {
    slug: 'glaucoma-medication-adherence',
    category: 'Glaucoma',
    audience: 'Patient',
    readingLevel: '6th grade',
    translations: {
      en: en({
        title: 'Using your glaucoma drops',
        summary:
          'Glaucoma drops protect the optic nerve by lowering pressure inside your eye. They work only if used every day.',
        keyPoints: [
          'Use the drops at the same time each day.',
          'Close your eye gently for 1 minute after each drop.',
          'Wait 5 minutes between different drops.',
          'Bring your bottles to every visit.',
        ],
        whenToCall: [
          'New eye pain or redness lasting more than a day.',
          'A halo of color around lights.',
          'Vision suddenly worsens.',
        ],
      }),
    },
  },
  {
    slug: 'diabetic-eye-screening',
    category: 'Retina',
    audience: 'Patient',
    readingLevel: '6th grade',
    translations: {
      en: en({
        title: 'Why diabetic eye exams matter',
        summary:
          'Diabetes can hurt the tiny blood vessels in the back of the eye. A yearly dilated exam catches early changes when they are easiest to treat.',
        keyPoints: [
          'Get a dilated eye exam at least once a year.',
          'Keep your A1C close to your goal.',
          'Control your blood pressure and cholesterol.',
          'Tell us right away if you see new spots, blurring, or shadows.',
        ],
        whenToCall: [
          'A sudden curtain or shadow over your vision.',
          'Many new floaters.',
          'Light flashes that do not go away.',
        ],
      }),
    },
  },
  {
    slug: 'contact-lens-hygiene',
    category: 'Contacts',
    audience: 'Patient',
    readingLevel: '6th grade',
    translations: {
      en: en({
        title: 'Healthy contact lens habits',
        summary:
          'Contact lenses are safe when you take care of them. Bad habits can cause painful infections.',
        keyPoints: [
          'Wash hands with soap and water before touching lenses.',
          'Never use tap water or saliva.',
          'Replace lenses on schedule. Replace the case every 3 months.',
          'Take lenses out before sleeping unless your doctor says otherwise.',
        ],
        whenToCall: [
          'A red, painful eye.',
          'A white spot on your cornea.',
          'Pain that does not get better when the lens is removed.',
        ],
      }),
    },
  },
  {
    slug: 'amblyopia-children',
    category: 'Pediatric',
    audience: 'Caregiver',
    readingLevel: '6th grade',
    translations: {
      en: en({
        title: 'Caring for a child with amblyopia',
        summary:
          'Amblyopia (lazy eye) is when one eye does not see as well as the other because the brain favors the stronger eye.',
        keyPoints: [
          'Follow the patching schedule the doctor gave you exactly.',
          'Make patching part of the daily routine.',
          'Treatment works best before age 7.',
          'Bring questions to every visit. Progress can be slow but real.',
        ],
        whenToCall: [
          'The patch causes a rash that does not go away.',
          'The child has new eye pain or constant tearing.',
          'You think the eye has turned more inward or outward.',
        ],
      }),
    },
  },
  {
    slug: 'lasik-overview',
    category: 'Refractive',
    audience: 'Patient',
    readingLevel: '8th grade',
    translations: {
      en: en({
        title: 'Is LASIK right for me?',
        summary:
          'LASIK reshapes the front of the eye to reduce or remove the need for glasses. It is not right for everyone.',
        keyPoints: [
          'You should be at least 18 with a stable prescription for one year.',
          'A thorough exam decides if you are a candidate.',
          'Most people are back at work the next day.',
          'Dry eye is common for a few months after surgery.',
        ],
        whenToCall: [
          'Severe pain after surgery.',
          'A sudden drop in vision.',
          'A flap problem (rubbing the eye, trauma).',
        ],
      }),
    },
  },
  {
    slug: 'screen-time-eyes',
    category: 'General',
    audience: 'Patient',
    readingLevel: '6th grade',
    translations: {
      en: en({
        title: 'Healthy eyes in the screen era',
        summary:
          'Long hours on screens do not damage the eye, but they cause strain, dryness, and tiredness.',
        keyPoints: [
          'Follow the 20-20-20 rule: every 20 minutes, look 20 feet away for 20 seconds.',
          'Keep the screen an arm’s length away.',
          'Use brighter room lighting, not just the screen.',
          'Blink fully. Use artificial tears if dryness happens.',
        ],
        whenToCall: [
          'New double vision.',
          'Sudden severe headaches with vision changes.',
          'Vision that does not get better after rest.',
        ],
      }),
    },
  },
];

export function getEducationTopic(slug: string): EducationTopic | null {
  return EDUCATION_TOPICS.find((t) => t.slug === slug) ?? null;
}
