# EyeQ AI. Clinical Validation Readiness

**Purpose:** Separate software functionality from clinical accuracy and regulatory validation.

EyeQ AI imaging review support is **not clinically validated** in this codebase unless a real validated model is configured with supporting evidence.

---

## Supported modalities (software workflow)

| Modality | Upload | Quality gate | Automated analysis |
|----------|--------|--------------|-------------------|
| Fundus | ✅ | ✅ metadata heuristics | Manual default |
| OCT | ✅ | ✅ | Manual default |
| Visual field | ✅ | ✅ | Manual default |
| Slit lamp / external | ✅ | ✅ | Manual default |
| Topography | ✅ | ✅ | Manual default |
| DICOM | ⚠️ upload accepted | Limited | Manual only |
| Unknown/Other | ✅ | Limited scope | Manual only |

## Supported findings per model

| Model | Findings | Validation status |
|-------|----------|-------------------|
| Manual review | None automated | N/A |
| External provider | Per vendor JSON schema | **Requires vendor documentation** |
| Development mock | Labeled test placeholder | **Not for clinical use** |

## Model version

- Default: **none** (manual review mode)
- External: set via provider response + `ModelRegistry` when configured

## Intended use

- Imaging **review support** for qualified eye care providers
- Workflow organization, quality gating, provider sign-off, patient-approved summaries
- **Not** autonomous diagnosis or treatment decisions

## Excluded use cases

- Definitive disease diagnosis without provider review
- Emergency triage without clinician involvement
- Replacing dilated examination or in-person care
- Screening claims without cleared device + validation evidence

## Quality thresholds

| Grade | Automated clinical analysis |
|-------|---------------------------|
| Not Gradable | **Stopped** |
| Gradable With Limitations | Allowed only if provider configured; caution required |
| Gradable | Proceeds to configured provider |

## Uncertainty behavior

- Low confidence / poor quality → no reassuring language
- Failed provider → manual review, no mock fallback in production
- Out of distribution → manual review message

## Validation metrics (placeholders: do not invent)

| Metric | Value |
|--------|-------|
| Sensitivity | _Pending study_ |
| Specificity | _Pending study_ |
| AUC | _Pending study_ |
| Subgroup performance | _Pending study_ |

## Processes required before clinical deployment

- [ ] Test dataset with ground truth
- [ ] Subgroup evaluation (age, ethnicity, disease severity)
- [ ] False-positive review workflow
- [ ] False-negative review workflow
- [ ] Calibration evaluation
- [ ] Provider feedback loop
- [ ] Model drift monitoring
- [ ] Change control + rollback
- [ ] Incident reporting

---

**Do not claim clinical accuracy until validated model + evidence exist.**
