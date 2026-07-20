import { describe, expect, it } from 'vitest';
import {
  EYE_HEALTH_ARTICLES,
  EYE_HEALTH_DISCLAIMER,
  EYE_HEALTH_URGENT_WARNING,
  getEyeHealthArticle,
  searchEyeHealthArticles,
} from '@/lib/eye-health/catalog';
import { explainArticlePlain } from '@/lib/eye-health/service';

describe('Eye Health Library catalog', () => {
  it('includes required starter articles', () => {
    const slugs = EYE_HEALTH_ARTICLES.map((a) => a.slug);
    expect(slugs).toContain('dry-eye');
    expect(slugs).toContain('myopia');
    expect(slugs).toContain('glaucoma-overview');
    expect(slugs).toContain('diabetic-eye-exam');
    expect(slugs).toContain('retinal-detachment-warning-signs');
    expect(EYE_HEALTH_ARTICLES.length).toBeGreaterThanOrEqual(15);
  });

  it('every article has disclaimer, prevention, treatment, and questions', () => {
    for (const a of EYE_HEALTH_ARTICLES) {
      expect(a.patientFriendlyDisclaimer).toContain('not a diagnosis');
      expect(a.preventionAndMaintenance.length).toBeGreaterThan(0);
      expect(a.treatmentOverview.length).toBeGreaterThan(0);
      expect(a.questionsToAskProvider.length).toBeGreaterThan(0);
      expect(a.sourceLinks.length).toBeGreaterThan(0);
      expect(a.treatmentOverview.join(' ').toLowerCase()).not.toMatch(/\byou need treatment\b/);
      expect(a.treatmentOverview.join(' ').toLowerCase()).not.toMatch(/\bthis will cure\b/);
    }
  });

  it('search finds common patient terms', () => {
    expect(searchEyeHealthArticles('dry eyes').some((a) => a.slug === 'dry-eye')).toBe(true);
    expect(searchEyeHealthArticles('floaters').length).toBeGreaterThan(0);
    expect(searchEyeHealthArticles('diabetic eye exam').some((a) => a.slug === 'diabetic-eye-exam')).toBe(
      true,
    );
  });

  it('explain helper stays non-diagnostic', () => {
    const article = getEyeHealthArticle('dry-eye')!;
    const text = explainArticlePlain(article);
    expect(text.toLowerCase()).toContain('not a diagnosis');
    expect(text.toLowerCase()).toContain('provider');
    expect(text).not.toMatch(/you have dry eye disease/i);
  });

  it('exports safety copy constants', () => {
    expect(EYE_HEALTH_DISCLAIMER).toMatch(/education only/i);
    expect(EYE_HEALTH_URGENT_WARNING).toMatch(/sudden vision loss/i);
  });
});
