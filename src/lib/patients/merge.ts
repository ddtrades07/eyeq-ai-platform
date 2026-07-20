export const MERGEABLE_FIELDS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'email',
  'phone',
  'addressLine1',
  'addressLine2',
  'city',
  'region',
  'postalCode',
  'insuranceCarrier',
  'insuranceMemberId',
  'preferredLanguage',
] as const;

export type MergeableField = (typeof MERGEABLE_FIELDS)[number];

export type MergeFieldConflict = {
  field: MergeableField;
  survivingValue: string;
  mergedValue: string;
  conflict: boolean;
};

export function normalizeFieldValue(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/**
 * Deterministically compute demographic conflicts between two patient
 * records. A conflict exists when both records have a differing non-empty
 * value for the same field.
 */
export function computeMergeFieldConflicts(
  surviving: Record<string, unknown>,
  merged: Record<string, unknown>,
): MergeFieldConflict[] {
  return MERGEABLE_FIELDS.map((field) => {
    const a = normalizeFieldValue(surviving[field]);
    const b = normalizeFieldValue(merged[field]);
    return {
      field,
      survivingValue: a,
      mergedValue: b,
      conflict: a !== b && b !== '',
    };
  });
}

/** Build the surviving-record patch given field-by-field selections. */
export function buildSurvivingPatch(
  merged: Record<string, unknown>,
  selections: Partial<Record<MergeableField, 'surviving' | 'merged'>>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const field of MERGEABLE_FIELDS) {
    if (selections[field] === 'merged') {
      patch[field] = merged[field];
    }
  }
  return patch;
}
