<script setup lang="ts">
import { computed } from "vue";
import type {
  ConfidenceField,
  SummariesResponse,
  SummaryEntry,
} from "../genesys";

const props = defineProps<{
  data: SummariesResponse | null;
}>();

const summaries = computed<SummaryEntry[]>(() => {
  if (!props.data) return [];
  return (
    props.data.sessionSummaries ||
    props.data.entities ||
    props.data.summaries ||
    []
  );
});

interface FieldView {
  text: string | null;
  description: string | null;
  confidence: number | null;
  outcome: string | null;
}

function viewOf(field: ConfidenceField | string | undefined): FieldView {
  if (!field) {
    return { text: null, description: null, confidence: null, outcome: null };
  }
  if (typeof field === "string") {
    return { text: field, description: null, confidence: null, outcome: null };
  }
  return {
    text: field.text || field.value || field.content || null,
    description: field.description || null,
    confidence: typeof field.confidence === "number" ? field.confidence : null,
    outcome: field.outcome || null,
  };
}

function pct(n: number | null): string | null {
  return n === null ? null : `${Math.round(n * 100)}%`;
}

function metaParts(s: SummaryEntry): string[] {
  const parts: string[] = [];
  if (s.mediaType) parts.push(s.mediaType);
  if (s.language) parts.push(s.language);
  if (s.status) parts.push(s.status);
  if (typeof s.confidence === "number") parts.push(`overall ${pct(s.confidence)}`);
  return parts;
}
</script>

<template>
  <section class="card">
    <header class="mb-3 flex items-baseline justify-between gap-3">
      <h2 class="m-0 text-base">AI summary</h2>
      <span class="text-xs text-muted">
        From <code>getConversationSummaries</code>
      </span>
    </header>

    <p v-if="!summaries.length" class="m-0 text-muted">
      No summaries returned for this conversation.
    </p>

    <article
      v-for="(s, i) in summaries"
      :key="s.id || i"
      class="[&+&]:mt-4 [&+&]:border-t [&+&]:border-dashed [&+&]:border-border [&+&]:pt-4"
    >
      <div
        v-if="metaParts(s).length"
        class="mb-2 flex flex-wrap gap-1.5 text-[11px] uppercase tracking-[0.5px] text-muted"
      >
        <span v-for="m in metaParts(s)" :key="m" class="chip">{{ m }}</span>
      </div>

      <p v-if="s.text" class="m-0 mb-3 text-[14px] leading-[1.55]">{{ s.text }}</p>

      <dl
        class="m-0 grid gap-y-2 gap-x-4 grid-cols-1 min-[600px]:grid-cols-[140px_1fr]"
      >
        <template v-if="viewOf(s.reason).text">
          <dt class="dt-label">Reason</dt>
          <dd class="dd-text">
            <span class="font-medium">{{ viewOf(s.reason).text }}</span>
            <span
              v-if="pct(viewOf(s.reason).confidence)"
              class="ml-1.5 text-xs text-muted"
            >
              ({{ pct(viewOf(s.reason).confidence) }})
            </span>
            <div
              v-if="viewOf(s.reason).description"
              class="mt-0.5 text-[13px] text-muted"
            >
              {{ viewOf(s.reason).description }}
            </div>
          </dd>
        </template>

        <template v-if="viewOf(s.resolution).text">
          <dt class="dt-label">Resolution</dt>
          <dd class="dd-text">
            <span class="font-medium">{{ viewOf(s.resolution).text }}</span>
            <span
              v-if="viewOf(s.resolution).outcome"
              class="ml-1.5 chip text-[11px]"
              :data-outcome="viewOf(s.resolution).outcome"
            >
              {{ viewOf(s.resolution).outcome }}
            </span>
            <span
              v-if="pct(viewOf(s.resolution).confidence)"
              class="ml-1.5 text-xs text-muted"
            >
              ({{ pct(viewOf(s.resolution).confidence) }})
            </span>
            <div
              v-if="viewOf(s.resolution).description"
              class="mt-0.5 text-[13px] text-muted"
            >
              {{ viewOf(s.resolution).description }}
            </div>
          </dd>
        </template>

        <template v-if="viewOf(s.followup).text">
          <dt class="dt-label">Follow-up</dt>
          <dd class="dd-text">
            <span class="font-medium">{{ viewOf(s.followup).text }}</span>
            <span
              v-if="pct(viewOf(s.followup).confidence)"
              class="ml-1.5 text-xs text-muted"
            >
              ({{ pct(viewOf(s.followup).confidence) }})
            </span>
            <div
              v-if="viewOf(s.followup).description"
              class="mt-0.5 text-[13px] text-muted"
            >
              {{ viewOf(s.followup).description }}
            </div>
          </dd>
        </template>

        <template v-if="viewOf(s.summary).text">
          <dt class="dt-label">Summary</dt>
          <dd class="dd-text">{{ viewOf(s.summary).text }}</dd>
        </template>

        <template
          v-if="
            s.suggestedWrapUpCode ||
            s.wrapUp ||
            (s.predictedWrapupCodes && s.predictedWrapupCodes.length)
          "
        >
          <dt class="dt-label">Suggested wrap-up</dt>
          <dd class="dd-text">
            {{
              s.suggestedWrapUpCode?.name ||
              s.wrapUp?.name ||
              s.wrapUp?.code ||
              s.predictedWrapupCodes?.[0]?.name ||
              "—"
            }}
          </dd>
        </template>
      </dl>
    </article>
  </section>
</template>

<style scoped>
@reference "../styles.css";

.chip[data-outcome="Resolved"] {
  color: var(--color-success);
  border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
}
.chip[data-outcome="Not Resolved"] {
  color: var(--color-warn);
  border-color: color-mix(in srgb, var(--color-warn) 40%, transparent);
}
</style>
