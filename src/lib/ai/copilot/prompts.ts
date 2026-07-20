import { SAFETY_PREAMBLE } from '@/lib/ai/prompts';
import type { CopilotRole, PageContext, SuggestedPrompt } from './types';

/**
 * Role-specific system prompts. Each prompt tells the AI who it is,
 * what it can and cannot do, and establishes the safety contract.
 */

const SHARED_RULES = `
Rules you MUST follow:
- You are an AI decision-support assistant inside EyeQ AI, an eye care practice platform.
- You DO NOT diagnose disease. You DO NOT prescribe medication.
- All clinical outputs require provider review before acting on them.
- Use cautious language: "possible", "suggestive of", "consider", "provider review recommended".
- Never produce a definitive diagnosis or treatment recommendation without the "provider review required" qualifier.
- When you cite patient data, always reference the source (appointment date, imaging date, note date).
- Keep responses concise and actionable, aim for 2-6 paragraphs max.
- If you lack sufficient information, say so clearly rather than guessing.
`;

const EXPLAINABILITY_INSTRUCTION = `
After your main response, always include a brief "Why EyeQ responded this way" section formatted as:

**Why EyeQ responded this way:**
- [data source 1]
- [data source 2]

⚠️ AI decision support only, provider review required.
`;

export function getSystemPrompt(copilotRole: CopilotRole): string {
  switch (copilotRole) {
    case 'provider':
      return `${SAFETY_PREAMBLE}

You are the EyeQ Provider Copilot, an intelligent clinical assistant for optometrists, ophthalmologists, and residents.

You can help with:
- Summarising a patient's longitudinal history
- Highlighting what changed since the last visit
- Explaining why Timeline Intelligence flagged a patient
- Summarising imaging history and progression signals
- Drafting SOAP notes, assessments, plans, referral letters, and patient instructions
- Identifying unresolved issues and deferred testing
- Answering clinical workflow questions

${SHARED_RULES}
${EXPLAINABILITY_INSTRUCTION}`;

    case 'front_desk':
      return `${SAFETY_PREAMBLE}

You are the EyeQ Front Desk Copilot, a smart scheduling and recall assistant.

You can help with:
- Identifying who should be called first for recalls
- Listing overdue patients and care gap priorities
- Predicting likely no-shows based on history
- Drafting reminder messages (SMS, email, phone scripts)
- Summarising tomorrow's schedule and today's bottlenecks
- Identifying incomplete intake forms

You do NOT have access to clinical details beyond what is needed for scheduling. Never share diagnosis-level information.

${SHARED_RULES}
${EXPLAINABILITY_INSTRUCTION}`;

    case 'technician':
      return `${SAFETY_PREAMBLE}

You are the EyeQ Technician Copilot, a pretest and workflow assistant.

You can help with:
- Identifying what testing may be needed for the current patient based on their appointment type and history
- Suggesting questions to ask during intake
- Flagging potential red flags from prior visits
- Summarising imaging history so you know what baseline exists
- Summarising the prior workup for continuity

You are NOT a provider. Do not interpret clinical findings or suggest diagnoses.

${SHARED_RULES}
${EXPLAINABILITY_INSTRUCTION}`;

    case 'optical':
      return `${SAFETY_PREAMBLE}

You are the EyeQ Optical Copilot, an optical sales and patient education assistant.

You can help with:
- Suggesting lens upgrades based on the patient's prescription and lifestyle
- Frame recommendations for different face shapes and preferences
- Dry-eye-friendly lens coating and material options
- Patient explanation scripts for AR coating, blue light, progressives, etc.
- Identifying optical revenue opportunities

You are NOT a prescriber. Always defer to the provider's prescription and clinical recommendations.

${SHARED_RULES}
${EXPLAINABILITY_INSTRUCTION}`;

    case 'patient':
      return `You are the EyeQ Patient Assistant, a friendly, educational helper for patients.

You can help patients understand:
- When their next appointment is scheduled
- When their prescription expires
- What their doctor recommended at the last visit (from signed notes only)
- Educational explanations of common eye conditions and procedures (OCT, dilation, glaucoma, dry eye, etc.)

STRICT RULES:
- You may ONLY use provider-approved information from signed clinical notes and appointment records.
- You MUST NOT expose internal AI flags, urgency scores, risk scores, or clinical intelligence signals.
- You MUST NOT diagnose or suggest treatment.
- Use warm, patient-friendly language at a 6th-grade reading level.
- If you don't know something, tell the patient to contact their eye care provider.
- Always end with: "For clinical questions, please contact your eye care provider."
`;

    default:
      return `${SAFETY_PREAMBLE}

You are the EyeQ AI assistant. Help the user with their question about the eye care practice platform.

${SHARED_RULES}
${EXPLAINABILITY_INSTRUCTION}`;
  }
}

/**
 * Role × page suggested prompts. The UI shows these as quick-tap chips
 * so the user always has something relevant to ask.
 */
export function getSuggestedPrompts(
  copilotRole: CopilotRole,
  page: PageContext,
  hasPatient: boolean,
): SuggestedPrompt[] {
  const prompts: SuggestedPrompt[] = [];

  // ── Page-specific prompts (role-independent) ─────────────────────
  switch (page) {
    case 'dashboard':
      prompts.push(
        { label: 'What needs attention today?', prompt: 'What needs attention today? Summarize any urgent items.', category: 'Workflow' },
        { label: 'Summarize today\'s schedule', prompt: 'Summarize today\'s schedule including any special cases.', category: 'Scheduling' },
        { label: 'Patients at risk of falling through the cracks', prompt: 'Which patients are at risk of falling through the cracks and why?', category: 'Intelligence' },
      );
      break;
    case 'patient_chart':
      if (hasPatient) {
        prompts.push(
          { label: 'Summarize this patient', prompt: 'Summarize this patient\'s full clinical picture.', category: 'Patient' },
          { label: 'What changed since last visit?', prompt: 'What has changed for this patient since their last completed visit?', category: 'Patient' },
          { label: 'Why was this patient flagged?', prompt: 'Why did Timeline Intelligence flag this patient? Explain each signal.', category: 'Intelligence' },
          { label: 'What follow-up is needed?', prompt: 'What follow-up is needed for this patient based on their history?', category: 'Patient' },
        );
      }
      break;
    case 'imaging':
      prompts.push(
        { label: 'Summarize imaging concerns', prompt: 'Summarize the imaging concerns for this patient.', category: 'Imaging' },
        { label: 'What should the provider review first?', prompt: 'What should the provider review first in this imaging study?', category: 'Imaging' },
        { label: 'Compare with prior imaging', prompt: 'Compare this imaging with prior studies and note any changes.', category: 'Imaging' },
      );
      break;
    case 'appointments':
      prompts.push(
        { label: 'Which visits may run long?', prompt: 'Which visits on today\'s schedule may run longer than expected and why?', category: 'Scheduling' },
        { label: 'Who needs pre-charting?', prompt: 'Which patients on today\'s schedule need pre-charting?', category: 'Workflow' },
        { label: 'Which patients need forms completed?', prompt: 'Which patients today still need intake forms or paperwork completed?', category: 'Workflow' },
      );
      break;
    case 'care_gaps':
      prompts.push(
        { label: 'Who should we contact first?', prompt: 'Who should we contact first for recalls today, and why?', category: 'Recalls' },
        { label: 'Draft recall message', prompt: 'Draft a recall message for the most overdue patient.', category: 'Communication' },
        { label: 'Which gaps are highest risk?', prompt: 'Which care gaps carry the highest clinical risk?', category: 'Intelligence' },
      );
      break;
    default:
      break;
  }

  // ── Role-specific prompts ────────────────────────────────────────
  if (copilotRole === 'provider') {
    if (hasPatient) {
      prompts.push(
        { label: 'Draft SOAP note', prompt: 'Generate a SOAP note draft for today\'s visit based on the patient context.', category: 'Documentation' },
        { label: 'Draft assessment & plan', prompt: 'Draft an assessment and plan based on this patient\'s history and today\'s visit.', category: 'Documentation' },
        { label: 'Imaging progression', prompt: 'Summarise the imaging history and note any progression signals.', category: 'Imaging' },
        { label: 'Unresolved issues', prompt: 'What are the unresolved clinical issues for this patient?', category: 'Intelligence' },
        { label: 'Draft referral letter', prompt: 'Draft a referral letter for this patient.', category: 'Documentation' },
        { label: 'Patient instructions', prompt: 'Generate patient instructions for today\'s visit.', category: 'Documentation' },
      );
    }
    if (page === 'dashboard') {
      prompts.push(
        { label: 'High-risk patients today', prompt: 'Show me the high-risk patients on today\'s schedule and why.', category: 'Workflow' },
        { label: 'Imaging reviews pending', prompt: 'Which patients need imaging review?', category: 'Workflow' },
      );
    }
  }

  if (copilotRole === 'front_desk') {
    prompts.push(
      { label: 'Overdue patients', prompt: 'List the patients who are most overdue for follow-up.', category: 'Recalls' },
      { label: 'Likely no-shows', prompt: 'Which patients on tomorrow\'s schedule are likely no-shows based on history?', category: 'Scheduling' },
      { label: 'Draft reminder message', prompt: 'Draft an SMS reminder for a patient with an upcoming appointment.', category: 'Communication' },
      { label: 'Incomplete intakes', prompt: 'Are there any patients today with incomplete intake forms?', category: 'Workflow' },
    );
  }

  if (copilotRole === 'technician' && hasPatient) {
    prompts.push(
      { label: 'Testing needed', prompt: 'What testing may be needed for this patient based on their history and appointment type?', category: 'Pretest' },
      { label: 'Questions to ask', prompt: 'What intake questions should I focus on for this patient?', category: 'Pretest' },
      { label: 'Red flags', prompt: 'Are there any red flags from prior visits I should be aware of?', category: 'Pretest' },
      { label: 'Prior imaging summary', prompt: 'Summarise this patient\'s imaging history.', category: 'Imaging' },
    );
  }

  if (copilotRole === 'optical') {
    prompts.push(
      { label: 'Lens upgrade suggestions', prompt: 'What lens upgrades would benefit this patient based on their prescription and lifestyle?', category: 'Optical' },
      { label: 'Dry-eye friendly options', prompt: 'What dry-eye-friendly lens options should I recommend?', category: 'Optical' },
      { label: 'Optical opportunities', prompt: 'What optical revenue opportunities exist for this patient?', category: 'Business' },
    );
  }

  if (copilotRole === 'patient') {
    prompts.push(
      { label: 'My next appointment', prompt: 'When is my next appointment?', category: 'Appointments' },
      { label: 'Prescription expiry', prompt: 'When does my prescription expire?', category: 'Prescriptions' },
      { label: 'Doctor\'s recommendations', prompt: 'What did my doctor recommend at my last visit?', category: 'Care' },
      { label: 'What is OCT?', prompt: 'Can you explain what an OCT scan is in simple terms?', category: 'Education' },
      { label: 'Explain glaucoma', prompt: 'What is glaucoma? Should I be worried?', category: 'Education' },
    );
  }

  // Deduplicate by label
  const seen = new Set<string>();
  return prompts.filter((p) => {
    if (seen.has(p.label)) return false;
    seen.add(p.label);
    return true;
  });
}
