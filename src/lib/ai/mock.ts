import type { AIProvider, ImagingReviewSignals } from './provider';

const ANATOMY_BY_TYPE: Record<string, string[]> = {
  FUNDUS: ['optic disc', 'macula', 'retinal vasculature'],
  OCT: ['retinal layers', 'foveal contour', 'RNFL'],
  VISUAL_FIELD: ['central field', 'peripheral field'],
  SLIT_LAMP: ['cornea', 'anterior chamber', 'lens'],
  TOPOGRAPHY: ['corneal curvature', 'astigmatism axis'],
  EXTERNAL_PHOTO: ['eyelid', 'conjunctiva'],
  OTHER: ['ocular surface'],
};

/**
 * Anti-hallucination mock provider.
 *
 * RULES:
 * - Never invent patient history, findings, diagnoses, or plans
 * - Always state what data source was used (or that data is missing)
 * - Always include "Missing information" when relevant
 * - Every response references "available EyeQ data" not invented facts
 */
export const mockAIProvider: AIProvider = {
  name: 'mock',

  async complete(messages) {
    const user = messages[messages.length - 1]?.content ?? '';
    const system = messages[0]?.content ?? '';
    const lower = user.toLowerCase();

    // Check if patient context was injected into the system prompt
    const hasPatientContext = system.includes('Patient:') || system.includes('patient_chart');
    const hasImagingContext = system.includes('Imaging:') || system.includes('imaging');
    const hasCareGapContext = system.includes('Care gap') || system.includes('care_gaps');
    const hasAppointmentContext = system.includes('Appointment') || system.includes('appointment');

    if (system.includes('EyeQ') || system.includes('eye-care')) {
      const response = generateCopilotMock(lower, hasPatientContext, hasImagingContext, hasCareGapContext, hasAppointmentContext);
      if (response) return response;
    }

    // Generic safe response
    const dataSources = [];
    if (hasPatientContext) dataSources.push('patient chart data');
    if (hasAppointmentContext) dataSources.push('appointment records');
    if (hasImagingContext) dataSources.push('imaging records');
    if (hasCareGapContext) dataSources.push('care gap data');

    return `Based on ${dataSources.length > 0 ? 'available EyeQ data (' + dataSources.join(', ') + ')' : 'general workflow context (no specific patient data loaded)'}:

I can help answer questions about the current context. For patient-specific responses, ensure a patient is selected.

**Missing information:** ${!hasPatientContext ? 'No patient-specific data was provided for this query. ' : ''}Detailed clinical findings require provider evaluation.

**Why EyeQ responded this way:**
- ${dataSources.length > 0 ? 'Used: ' + dataSources.join(', ') : 'No patient data in context'}
- Response limited to available data only

⚠️ AI decision support only, provider review required.`;
  },

  async embed() {
    return null;
  },

  async reviewImaging({ imageType }): Promise<ImagingReviewSignals> {
    const anatomy = ANATOMY_BY_TYPE[imageType] ?? ANATOMY_BY_TYPE.OTHER;
    return {
      quality: 'good',
      anatomyDetected: anatomy,
      flags: [],
      urgency: 'routine',
      confidence: 'moderate',
      notes: [
        'Image acceptable for clinician review.',
        'Consider comparing with prior baseline when available.',
        'Findings should be confirmed by the reviewing provider.',
      ],
      disclaimer:
        'EyeQ AI provides review-support signals only. Final clinical interpretation is the responsibility of the supervising provider.',
    };
  },
};

function generateCopilotMock(
  lower: string,
  hasPatient: boolean,
  hasImaging: boolean,
  hasCareGaps: boolean,
  hasAppointments: boolean,
): string | null {
  const sources: string[] = [];
  if (hasPatient) sources.push('patient chart data');
  if (hasImaging) sources.push('imaging records');
  if (hasCareGaps) sources.push('care gap data');
  if (hasAppointments) sources.push('appointment records');
  const sourceStr = sources.length > 0 ? sources.join(', ') : 'general context only';

  if (lower.includes('summarise') || lower.includes('summarize') || lower.includes('summary')) {
    if (!hasPatient) {
      return `No patient is currently selected. I cannot generate a patient summary without patient data.

**To get a summary:** Select a patient using Ctrl/Cmd + K, or open a patient chart.

**Why EyeQ responded this way:**
- No patient context available

⚠️ AI decision support only, provider review required.`;
    }
    return `**Based on available EyeQ data** (${sourceStr}):

The information below is drawn from what is currently documented in the patient's chart. Sections not listed have no data available in the system.

- Visit history: Data from appointment records on file
- Imaging: ${hasImaging ? 'Imaging studies on file, see Imaging tab for details' : 'No imaging data loaded in this context'}
- Care gaps: ${hasCareGaps ? 'Care gap records available, see Care Gaps tab' : 'No care gap data loaded in this context'}
- Prescriptions: Check Prescriptions section for current details

**Missing information:** Any clinical findings, diagnoses, or exam details not entered into EyeQ are not reflected above. This summary only includes documented data.

**Why EyeQ responded this way:**
- Data sources: ${sourceStr}
- Only documented information included, nothing inferred or invented

⚠️ AI decision support only, provider review required.`;
  }

  if (lower.includes('soap') || lower.includes('note draft')) {
    return `**SOAP Note Template** (Provider must complete all sections)

**S (Subjective):** ${hasPatient ? 'Review patient-reported symptoms from chart. Chief complaint to be confirmed by provider.' : 'No patient data loaded, provider must document.'}

**O (Objective):** Not available from EyeQ data alone. Provider must document exam findings, vitals, and clinical observations from today's visit.

**A (Assessment):** Not generated, assessment requires provider clinical judgment. EyeQ does not diagnose.

**P (Plan):** Not generated, plan requires provider determination. Consider reviewing any open care gaps.

**Missing information:** Exam findings, clinical assessment, and treatment plan must be completed by the provider. This template contains no invented findings.

**Why EyeQ responded this way:**
- Template generated; clinical sections left for provider
- EyeQ does not fabricate exam findings or diagnoses

⚠️ AI decision support only, provider review required.`;
  }

  if (lower.includes('flag') || lower.includes('why')) {
    if (!hasPatient) {
      return `No patient is selected. I cannot explain flags without patient context.

Select a patient first using Ctrl/Cmd + K.

**Why EyeQ responded this way:**
- No patient context available`;
    }
    return `**Based on available EyeQ data** (${sourceStr}):

Timeline Intelligence flags are generated from documented data only:
- Appointment adherence patterns from scheduling records
- Documented risk factors (diabetes, hypertension, glaucoma history) if entered in the chart
- Care gap status from the care gap tracker
- Imaging review status from imaging records

**Missing information:** If risk factors or conditions are not documented in the chart, they will not be flagged. Ensure the patient chart is up to date.

**Why EyeQ responded this way:**
- Rule-based analysis of documented chart data
- No information was inferred or assumed

⚠️ AI decision support only, provider review required.`;
  }

  if (lower.includes('imaging') || lower.includes('oct') || lower.includes('fundus')) {
    return `**Based on available EyeQ data** (${sourceStr}):

${hasImaging ? 'Imaging records exist for this patient. For detailed findings, open the Imaging tab and run a structured review on each study.' : 'No imaging data is currently loaded in context. Open the patient chart and navigate to Imaging for study details.'}

**Important:** EyeQ does not interpret images or generate diagnoses. All imaging findings shown in structured reviews are flagged for provider verification only.

**Missing information:** Actual image interpretation requires provider review of the image itself. AI-generated flags are screening suggestions, not findings.

**Why EyeQ responded this way:**
- Imaging records status checked
- No image interpretation performed

⚠️ AI decision support only, provider review required.`;
  }

  if (lower.includes('care gap') || lower.includes('overdue') || lower.includes('recall') || lower.includes('contact')) {
    return `**Based on available EyeQ data** (${sourceStr}):

${hasCareGaps ? 'Care gap records are on file. Check the Care Gaps page for specific patients and gap types.' : 'No care gap data loaded in this context. Navigate to Care Gaps for the full list.'}

Care gap prioritization is based on:
- Gap type and clinical category
- Time since last relevant visit
- Documented risk factors

**Missing information:** Patients not yet entered into the care gap tracker will not appear. Ensure recall lists are up to date.

**Why EyeQ responded this way:**
- Care gap records analyzed (if available)
- Prioritization based on documented data only

⚠️ AI decision support only, provider review required.`;
  }

  if (lower.includes('attention') || lower.includes('today') || lower.includes('priority') || lower.includes('schedule')) {
    return `**Based on available EyeQ data** (${sourceStr}):

Today's priorities are determined from:
${hasAppointments ? '- Appointment records for today' : '- No appointment data loaded in this context'}
${hasImaging ? '- Pending imaging reviews' : '- Imaging status not loaded'}
${hasCareGaps ? '- Open care gaps' : '- Care gap data not loaded'}

For a complete picture, check:
1. Dashboard for today's schedule overview
2. Imaging page for pending reviews
3. Care Gaps page for outreach priorities

**Missing information:** ${!hasAppointments ? 'Today\'s appointment data was not loaded. ' : ''}Real-time priorities depend on current schedule data.

**Why EyeQ responded this way:**
- Data sources: ${sourceStr}
- Only documented information referenced

⚠️ AI decision support only, provider review required.`;
  }

  if (lower.includes('explain') || lower.includes('what is') || lower.includes('what does')) {
    return `I can provide general educational information about eye care topics.

For specific clinical questions about your condition or treatment, please consult your eye care provider directly, they have the full context of your care.

For clinical questions, please contact your eye care provider.`;
  }

  if (lower.includes('lens') || lower.includes('frame') || lower.includes('optical') || lower.includes('dry eye')) {
    return `**Based on available EyeQ data** (${sourceStr}):

${hasPatient ? 'Optical recommendations should be based on the patient\'s current prescription and documented visual needs.' : 'No patient data loaded, select a patient for personalized suggestions.'}

General optical discussion points (verify with patient):
- Lens type appropriate for prescription
- Coating options based on lifestyle
- Frame compatibility with prescription

**Missing information:** Patient lifestyle preferences, insurance coverage, and specific visual complaints should be discussed in person. EyeQ does not make specific product recommendations.

**Why EyeQ responded this way:**
- General optical guidance provided
- Specific recommendations require provider/optician input

⚠️ AI decision support only, provider review required.`;
  }

  if (lower.includes('test') || lower.includes('pretest') || lower.includes('workup')) {
    return `**Based on available EyeQ data** (${sourceStr}):

Standard pretesting may include: visual acuity, autorefraction, IOP measurement.

Additional testing depends on:
- Appointment type and reason for visit
- Patient's documented conditions and risk factors
- Prior test results and when they were last performed
- Provider preferences

**Missing information:** Specific testing recommendations require knowledge of today's visit type and the patient's clinical history. Check the patient chart for documented conditions.

**Why EyeQ responded this way:**
- General pretesting guidelines referenced
- Patient-specific recommendations require chart review

⚠️ AI decision support only, provider review required.`;
  }

  return null;
}
