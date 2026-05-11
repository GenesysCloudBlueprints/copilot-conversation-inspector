<script setup lang="ts">
import { computed, ref } from "vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import {
    DEFAULT_RANGE_HOURS,
    PAGE_SIZE,
    TIME_RANGES,
    formatSdkError,
    getMyUserId,
    listRecentConversations,
    type ConversationListEntry,
    type ConversationsQueryResponse,
} from "../genesys";

withDefaults(
    defineProps<{
        selectedId?: string;
        busy?: boolean;
    }>(),
    { selectedId: "", busy: false },
);

const emit = defineEmits<{
    (e: "pick", conversationId: string): void;
}>();

const page = ref<number>(1);
const windowHours = ref<number>(DEFAULT_RANGE_HOURS);
const mineOnly = ref<boolean>(true);

// Resolve the signed-in user's id once, cached forever for the session.
const meQuery = useQuery({
    queryKey: ["genesys", "users", "me"],
    queryFn: getMyUserId,
    staleTime: Infinity,
});
const myUserId = computed<string | undefined>(() => meQuery.data.value);

// True when "Mine only" is selected but we still have no user id to filter by.
const blockedOnMissingUser = computed<boolean>(
    () => mineOnly.value && !myUserId.value && !meQuery.isFetching.value,
);

const conversationsQuery = useQuery({
    queryKey: computed(() => [
        "genesys",
        "conversations",
        {
            windowHours: windowHours.value,
            userId: mineOnly.value ? myUserId.value : null,
            page: page.value,
        },
    ]),
    queryFn: () =>
        listRecentConversations(page.value, {
            windowHours: windowHours.value,
            userId: mineOnly.value ? myUserId.value : undefined,
        }),
    // Don't fire when "Mine only" is selected but the user id hasn't resolved.
    enabled: computed(() => !(mineOnly.value && !myUserId.value)),
    // Smooth pagination: keep the previous page visible while the next one loads.
    placeholderData: keepPreviousData,
});

const data = computed<ConversationsQueryResponse | null>(
    () => conversationsQuery.data.value ?? null,
);
const items = computed<ConversationListEntry[]>(
    () => data.value?.conversations ?? [],
);
const totalHits = computed<number>(() => data.value?.totalHits ?? 0);
const totalPages = computed<number>(() =>
    totalHits.value ? Math.max(1, Math.ceil(totalHits.value / PAGE_SIZE)) : 1,
);
const loading = computed<boolean>(
    () => conversationsQuery.isFetching.value || meQuery.isFetching.value,
);
const error = computed<string>(() => {
    const e = conversationsQuery.error.value;
    return e ? "Couldn't load conversations: " + formatSdkError(e) : "";
});
const canPrev = computed<boolean>(() => page.value > 1 && !loading.value);
const canNext = computed<boolean>(
    () => page.value < totalPages.value && !loading.value,
);

function prev(): void {
    if (canPrev.value) page.value -= 1;
}
function next(): void {
    if (canNext.value) page.value += 1;
}
function refresh(): void {
    void conversationsQuery.refetch();
}
function onRangeChange(): void {
    page.value = 1;
}
function setScope(mine: boolean): void {
    if (mineOnly.value === mine || loading.value) return;
    mineOnly.value = mine;
    page.value = 1;
}

function customer(c: ConversationListEntry): string {
    const p = (c.participants || []).find((x) => x.purpose === "customer");
    return p?.participantName || "—";
}
function mediaTypes(c: ConversationListEntry): string {
    const set = new Set<string>();
    (c.participants || []).forEach((p) =>
        (p.sessions || []).forEach((s) => {
            if (s.mediaType) set.add(s.mediaType);
        }),
    );
    return [...set].join(", ") || "—";
}
function fmt(iso: string | undefined): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}
function durationMs(c: ConversationListEntry): string {
    if (!c.conversationStart || !c.conversationEnd) return "—";
    const ms =
        new Date(c.conversationEnd).getTime() -
        new Date(c.conversationStart).getTime();
    if (ms < 0 || Number.isNaN(ms)) return "—";
    const s = Math.round(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m ? `${m}m ${r}s` : `${r}s`;
}
</script>

<template>
    <section class="card">
        <header class="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
                <h2 class="m-0 mb-0.5 text-base">Recent conversations</h2>
                <span class="text-xs text-muted">
                    From <code>postAnalyticsConversationsDetailsQuery</code>
                </span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <div
                    role="group"
                    aria-label="Conversation scope"
                    class="inline-flex overflow-hidden rounded-lg border border-border bg-panel-2"
                >
                    <button
                        type="button"
                        class="seg"
                        :data-active="mineOnly"
                        :disabled="loading"
                        title="Only conversations you participated in"
                        @click="setScope(true)"
                    >
                        Mine only
                    </button>
                    <button
                        type="button"
                        class="seg border-l border-border"
                        :data-active="!mineOnly"
                        :disabled="loading"
                        title="All conversations your role can see"
                        @click="setScope(false)"
                    >
                        All
                    </button>
                </div>
                <select
                    v-model.number="windowHours"
                    :disabled="loading"
                    class="select w-auto min-w-[160px] px-2.5 py-1.5"
                    @change="onRangeChange"
                >
                    <option
                        v-for="r in TIME_RANGES"
                        :key="r.value"
                        :value="r.value"
                    >
                        {{ r.label }}
                    </option>
                </select>
                <button class="btn-ghost" :disabled="loading" @click="refresh">
                    {{ loading ? "Loading…" : "Refresh" }}
                </button>
            </div>
        </header>

        <p v-if="error" class="alert-error mb-3">{{ error }}</p>

        <div
            v-if="!error"
            class="max-h-[360px] overflow-auto rounded-[10px] border border-border"
        >
            <table class="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                    <tr>
                        <th class="cell th">Started</th>
                        <th class="cell th">Duration</th>
                        <th class="cell th">Customer</th>
                        <th class="cell th">Media</th>
                        <th class="cell th id">Conversation ID</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loading && !items.length">
                        <td colspan="5" class="cell empty">Loading…</td>
                    </tr>
                    <tr v-else-if="!items.length && blockedOnMissingUser">
                        <td colspan="5" class="cell empty">
                            <div>Couldn't identify which user you are.</div>
                            <div class="empty-sub">
                                Add the <code>user-basic-info</code> (or broader
                                <code>users:readonly</code>) scope to your OAuth
                                client and sign in again — or click
                                <strong>All</strong> above to browse every
                                conversation your role can see.
                            </div>
                        </td>
                    </tr>
                    <tr v-else-if="!items.length && mineOnly">
                        <td colspan="5" class="cell empty">
                            <div>
                                You don't have any conversations in this time
                                range.
                            </div>
                            <div class="empty-sub">
                                Try a longer window, or click
                                <strong>All</strong> to see conversations across
                                your org.
                            </div>
                        </td>
                    </tr>
                    <tr v-else-if="!items.length">
                        <td colspan="5" class="cell empty">
                            No conversations in this time range.
                        </td>
                    </tr>
                    <tr
                        v-for="c in items"
                        v-else
                        :key="c.conversationId"
                        class="row"
                        :data-selected="c.conversationId === selectedId"
                        :data-busy="busy"
                        @click="!busy && emit('pick', c.conversationId)"
                    >
                        <td class="cell">{{ fmt(c.conversationStart) }}</td>
                        <td class="cell">{{ durationMs(c) }}</td>
                        <td class="cell">{{ customer(c) }}</td>
                        <td class="cell">{{ mediaTypes(c) }}</td>
                        <td class="cell id mono">{{ c.conversationId }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <footer class="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span class="text-xs text-muted">
                Page {{ page }} of {{ totalPages }} · {{ totalHits }} total
            </span>
            <div class="flex gap-2">
                <button class="btn-ghost" :disabled="!canPrev" @click="prev">
                    ← Prev
                </button>
                <button class="btn-ghost" :disabled="!canNext" @click="next">
                    Next →
                </button>
            </div>
        </footer>
    </section>
</template>

<style scoped>
@reference "../styles.css";

.seg {
    @apply cursor-pointer rounded-none border-0 bg-transparent px-3.5 py-1.5
         text-[13px] font-medium text-muted transition-colors;
    font: inherit;
}
.seg:hover:not(:disabled):not([data-active="true"]) {
    @apply bg-white/5 text-ink;
}
.seg[data-active="true"] {
    @apply bg-brand text-white;
}
.seg:disabled {
    @apply cursor-not-allowed opacity-50;
}

.cell {
    @apply whitespace-nowrap border-b border-border px-3 py-2.5 text-left;
}
.th {
    @apply sticky top-0 bg-panel text-[11px] font-semibold uppercase
         tracking-[0.5px] text-muted;
}
.id {
    width: 1%;
}
.mono {
    @apply text-xs text-muted;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.empty {
    @apply p-6 text-center text-muted;
}
.empty-sub {
    @apply mx-auto mt-1.5 max-w-[480px] text-xs leading-[1.5];
}

.row {
    @apply cursor-pointer transition-colors;
}
.row:hover {
    @apply bg-white/5;
}
.row:hover .id {
    color: var(--color-brand-2);
}
.row[data-selected="true"] {
    background: color-mix(in srgb, var(--color-brand) 12%, transparent);
}
.row[data-selected="true"] .id {
    color: var(--color-brand-2);
}
.row[data-busy="true"] {
    cursor: progress;
    @apply opacity-70;
}
</style>
