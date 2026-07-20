'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ExamChartStatus, type Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { EXAM_SECTIONS } from '@/lib/exam/sections';

export const getOrCreateExamChart = action({
  schema: z.object({ encounterId: z.string() }),
  async handler({ encounterId }) {
    const user = await assertPermission('notes:write');
    if (!user.organizationId) throw new Error('No organization context');

    const encounter = await db.encounter.findUnique({
      where: { id: encounterId },
      include: { examChart: true },
    });
    if (!encounter) throw new Error('Encounter not found');
    assertSameOrg(user, encounter);

    if (encounter.examChart) return encounter.examChart;

    const chart = await db.examChart.create({
      data: {
        organizationId: user.organizationId,
        encounterId,
        patientId: encounter.patientId,
        providerId: encounter.providerId,
        sectionData: {},
        status: ExamChartStatus.DRAFT,
      },
    });

    revalidatePath(`/provider/encounters/${encounterId}/exam`);
    return chart;
  },
});

export const updateExamChartSections = action({
  schema: z.object({
    chartId: z.string(),
    sections: z.record(z.union([z.string(), z.boolean(), z.null()])),
  }),
  async handler({ chartId, sections }) {
    const user = await assertPermission('notes:write');
    if (!user.organizationId) throw new Error('No organization context');

    const chart = await db.examChart.findUnique({ where: { id: chartId } });
    if (!chart) throw new Error('Exam chart not found');
    assertSameOrg(user, chart);
    if (chart.status === ExamChartStatus.SIGNED) {
      throw new Error('Signed exam charts cannot be edited. Add an addendum note instead.');
    }

    const existing = (chart.sectionData as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...sections };

    const updated = await db.examChart.update({
      where: { id: chartId },
      data: {
        sectionData: merged as Prisma.InputJsonValue,
        status: ExamChartStatus.IN_PROGRESS,
        version: { increment: 1 },
      },
    });

    revalidatePath(`/provider/encounters/${chart.encounterId}/exam`);
    return updated;
  },
});

export const applyNormalFindings = action({
  schema: z.object({ chartId: z.string(), sectionKey: z.string() }),
  async handler({ chartId, sectionKey }) {
    const user = await assertPermission('notes:write');
    if (!user.organizationId) throw new Error('No organization context');

    const def = EXAM_SECTIONS.find((s) => s.key === sectionKey);
    if (!def?.normalMacro) throw new Error('No normal macro for this section');

    const chart = await db.examChart.findUnique({ where: { id: chartId } });
    if (!chart) throw new Error('Exam chart not found');
    assertSameOrg(user, chart);

    const existing = (chart.sectionData as Record<string, unknown>) ?? {};
    const updated = await db.examChart.update({
      where: { id: chartId },
      data: {
        sectionData: { ...existing, [sectionKey]: def.normalMacro } as Prisma.InputJsonValue,
        status: ExamChartStatus.IN_PROGRESS,
      },
    });

    revalidatePath(`/provider/encounters/${chart.encounterId}/exam`);
    return updated;
  },
});

export const signExamChart = action({
  schema: z.object({ chartId: z.string() }),
  async handler({ chartId }) {
    const user = await assertPermission('notes:sign');
    if (!user.organizationId) throw new Error('No organization context');

    const chart = await db.examChart.findUnique({ where: { id: chartId } });
    if (!chart) throw new Error('Exam chart not found');
    assertSameOrg(user, chart);

    const updated = await db.examChart.update({
      where: { id: chartId },
      data: {
        status: ExamChartStatus.SIGNED,
        signedAt: new Date(),
        signedById: user.id,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SIGN_OFF',
      resourceType: 'ExamChart',
      resourceId: chartId,
    });

    revalidatePath(`/provider/encounters/${chart.encounterId}/exam`);
    return updated;
  },
});
