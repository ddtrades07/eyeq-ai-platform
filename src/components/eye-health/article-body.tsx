import {
  EYE_HEALTH_DISCLAIMER,
  EYE_HEALTH_URGENT_WARNING,
  type EyeHealthArticle,
} from '@/lib/eye-health/catalog';

export function EyeHealthArticleBody({
  article,
  showUrgent,
}: {
  article: EyeHealthArticle;
  showUrgent?: boolean;
}) {
  const urgent = showUrgent ?? article.showUrgentBanner;
  return (
    <div className="space-y-6 text-sm leading-relaxed">
      <div className="rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-3 text-sky-950">
        {EYE_HEALTH_DISCLAIMER}
      </div>
      {urgent ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
          {EYE_HEALTH_URGENT_WARNING}
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Summary</h2>
        <p className="text-muted-foreground">{article.plainLanguageSummary}</p>
      </section>

      <Section title="What it means" items={[article.whatItMeans]} asParagraph />
      <Section title="Common symptoms people ask about" items={article.commonSymptoms} />
      <Section title="Possible causes or risk factors" items={article.possibleCausesOrRiskFactors} />
      <Section title="Prevention and maintenance" items={article.preventionAndMaintenance} />
      <Section title="Treatment overview (general)" items={article.treatmentOverview} />
      <Section title="What your provider may check" items={article.whatYourProviderMayCheck} />
      <Section title="Questions to ask your provider" items={article.questionsToAskProvider} />
      <Section title="When to contact the office" items={article.whenToContactOffice} />
      {article.urgentWarningSigns.length ? (
        <Section title="Urgent warning signs" items={article.urgentWarningSigns} />
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Learn more (external sources)</h2>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {article.sourceLinks.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          EyeQ summaries are original educational paraphrases. We do not copy full third-party articles.
        </p>
      </section>
    </div>
  );
}

function Section({
  title,
  items,
  asParagraph,
}: {
  title: string;
  items: string[];
  asParagraph?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {asParagraph ? (
        <p className="text-muted-foreground">{items[0]}</p>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
