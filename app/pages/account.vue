<script setup>
import { computed, ref, watch } from "vue";

definePageMeta({ middleware: "auth" });

useHead({ title: "Meu Perfil" });

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const toast = useToast();

const isLoading = ref(false);
const isBootstrapping = ref(false);
const selectedFile = ref(null);

const form = ref({
  name: "",
  username: "",
  location: "",
  accountType: "personal",
  bio: "",
  allowEmailNotifications: true,
  showLocation: true,
  allowProposals: true,
  avatarUrl: "",
});

const accountTypes = [
  { label: "Pessoal", value: "personal" },
  { label: "Entidade Comercial", value: "business" },
  { label: "Ponto de Recolha", value: "pickup_point" },
];

function buildFallbackUsername() {
  const rawEmail = user.value?.email || "";
  const base = rawEmail.split("@")[0] || "utilizador";
  const sanitized = base.toLowerCase().replace(/[^a-z0-9_]/g, "");
  const suffix = user.value?.id?.slice(0, 6) || "user";
  const safe = sanitized.length >= 3 ? sanitized : "utilizador";
  return `${safe}_${suffix}`;
}

async function ensureProfile() {
  if (!user.value?.id || myProfile.value || isBootstrapping.value) return;

  isBootstrapping.value = true;

  try {
    const metadata = user.value?.user_metadata || {};
    const nameFromMeta = metadata.full_name || metadata.name;
    const usernameFromMeta = metadata.username;

    const baseName =
      nameFromMeta || user.value?.email?.split("@")[0] || "Utilizador";
    const username = usernameFromMeta || buildFallbackUsername();

    const { error } = await supabase.from("profiles").insert({
      id: user.value.id,
      name: baseName,
      username,
      account_type: "personal",
    });

    if (error) {
      toast.add({
        title: "Perfil não criado",
        description: error.message,
        color: "error",
      });
    }

    await refreshProfile();
  } catch (error) {
    toast.add({
      title: "Erro ao criar perfil",
      description: error instanceof Error ? error.message : "Tente novamente.",
      color: "error",
    });
  } finally {
    isBootstrapping.value = false;
  }
}

const { data: myProfile, refresh: refreshProfile } = await useAsyncData(
  "account-profile",
  async () => {
    if (!user.value?.id) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, name, username, location, account_type, avatar_url, created_at",
      )
      .eq("id", user.value.id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },
  { watch: [() => user.value?.id] },
);

const { data: completedTrades } = await useAsyncData(
  "account-trades",
  async () => {
    if (!user.value?.id) return 0;

    const { count, error } = await supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .or(`buyer_id.eq.${user.value.id},seller_id.eq.${user.value.id}`);

    if (error) throw error;
    return count || 0;
  },
  { watch: [() => user.value?.id] },
);

const { data: avgRating } = await useAsyncData(
  "account-rating",
  async () => {
    if (!user.value?.id) return 0;

    const { data, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("reviewed_user_id", user.value.id);

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    const sum = data.reduce((acc, row) => acc + Number(row.rating || 0), 0);
    return Number((sum / data.length).toFixed(1));
  },
  { watch: [() => user.value?.id] },
);

const memberYear = computed(() => {
  const raw = myProfile.value?.created_at;
  if (!raw) return new Date().getFullYear();
  return new Date(raw).getFullYear();
});

watch(
  () => myProfile.value,
  (profileValue) => {
    if (!profileValue) return;

    form.value.name = profileValue.name || "";
    form.value.username = profileValue.username || "";
    form.value.location = profileValue.location || "";
    form.value.accountType = profileValue.account_type || "personal";
    form.value.avatarUrl = profileValue.avatar_url || "";

    if (!import.meta.client) return;

    const key = `idem-locus:account-prefs:${profileValue.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        form.value.bio = parsed.bio || "";
        form.value.allowEmailNotifications =
          parsed.allowEmailNotifications ?? true;
        form.value.showLocation = parsed.showLocation ?? true;
        form.value.allowProposals = parsed.allowProposals ?? true;
      } catch {
        // ignore invalid local data
      }
    }
  },
  { immediate: true },
);

watch(
  () => user.value?.id,
  () => {
    ensureProfile();
  },
  { immediate: true },
);

function triggerEdit() {
  const el = document.getElementById("account-name-input");
  el?.focus();
}

function formatRating(value) {
  if (!value) return "-";
  return value.toFixed(1);
}

function handleFile(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;

  selectedFile.value = file;
  form.value.avatarUrl = URL.createObjectURL(file);
}

async function saveProfile() {
  if (!user.value?.id) return;

  const usernameRegex = /^[a-z0-9_]{3,20}$/;

  if (!form.value.username.trim()) {
    form.value.username = buildFallbackUsername();
  }

  if (!form.value.name.trim() || !form.value.username.trim()) {
    toast.add({
      title: "Campos obrigatórios",
      description: "Nome e username são obrigatórios.",
      color: "warning",
    });
    return;
  }

  if (!usernameRegex.test(form.value.username.trim())) {
    toast.add({
      title: "Username inválido",
      description: "Use 3-20 caracteres, apenas minúsculas, números e _.",
      color: "warning",
    });
    return;
  }

  isLoading.value = true;

  try {
    let avatarUrl = myProfile.value?.avatar_url || "";

    if (selectedFile.value) {
      const sanitized = selectedFile.value.name.replace(/[^a-zA-Z0-9.]/g, "");
      const fileName = `${user.value.id}-${Date.now()}-${sanitized}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, selectedFile.value, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      avatarUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.value.id,
        name: form.value.name.trim(),
        username: form.value.username.trim(),
        location: form.value.location.trim() || null,
        account_type: form.value.accountType,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) throw error;

    if (import.meta.client) {
      const key = `idem-locus:account-prefs:${user.value.id}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          bio: form.value.bio,
          allowEmailNotifications: form.value.allowEmailNotifications,
          showLocation: form.value.showLocation,
          allowProposals: form.value.allowProposals,
        }),
      );
    }

    toast.add({ title: "Perfil atualizado", color: "success" });
    selectedFile.value = null;
    await refreshProfile();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível guardar o perfil.";

    toast.add({
      title: "Erro ao guardar",
      description: message,
      color: "error",
    });
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="idem-page py-10">
    <section
      class="mx-auto grid w-full max-w-6xl gap-8 px-6 md:grid-cols-[280px_1fr]"
    >
      <div>
        <h1
          class="mb-8 font-serif text-6xl font-bold text-[var(--primary-deep)]"
        >
          Meu Perfil
        </h1>

        <div
          class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
        >
          <div class="flex flex-col items-center text-center">
            <label class="group relative cursor-pointer">
              <img
                :src="
                  form.avatarUrl ||
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format'
                "
                alt="Avatar"
                class="h-32 w-32 rounded-full border-4 border-white object-cover shadow"
              />
              <span
                class="absolute bottom-0 right-0 rounded-full bg-[var(--primary)] p-2 text-white opacity-0 transition group-hover:opacity-100"
              >
                <UIcon name="i-lucide-camera" class="h-4 w-4" />
              </span>
              <input
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFile"
              />
            </label>

            <p
              class="mt-5 font-serif text-4xl font-semibold text-[var(--primary-deep)]"
            >
              {{ form.name || "Utilizador" }}
            </p>
            <p class="mt-1 flex items-center gap-1 text-[#5C6B5E]">
              <UIcon name="i-lucide-map-pin" class="h-4 w-4" />
              {{ form.location || "Sem localidade" }}
            </p>
          </div>

          <div class="my-5 border-t border-[var(--border)]" />

          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="font-serif text-4xl font-bold text-[var(--accent)]">
                {{ completedTrades || 0 }}
              </p>
              <p class="text-sm text-[#5C6B5E]">Trocas</p>
            </div>
            <div>
              <p class="font-serif text-4xl font-bold text-[var(--accent)]">
                {{ formatRating(avgRating) }}
              </p>
              <p class="text-sm text-[#5C6B5E]">Rating</p>
            </div>
            <div>
              <p class="font-serif text-4xl font-bold text-[var(--accent)]">
                {{ memberYear }}
              </p>
              <p class="text-sm text-[#5C6B5E]">Membro</p>
            </div>
          </div>

          <div class="my-5 border-t border-[var(--border)]" />

          <button
            type="button"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-base font-medium text-white"
            @click="triggerEdit"
          >
            <UIcon name="i-lucide-pencil" class="h-4 w-4" />
            Editar Perfil
          </button>
        </div>
      </div>

      <div class="space-y-6 pt-20">
        <div
          class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm"
        >
          <h2
            class="mb-6 font-serif text-4xl font-semibold text-[var(--primary-deep)]"
          >
            Informações Pessoais
          </h2>

          <form class="space-y-5" @submit.prevent="saveProfile">
            <div>
              <label class="mb-2 block text-xl text-[var(--primary-deep)]"
                >Nome completo</label
              >
              <UInput
                id="account-name-input"
                v-model="form.name"
                placeholder="Nome completo"
                size="xl"
                :ui="{
                  base: 'w-full rounded-xl border-transparent bg-[var(--muted)] focus:border-[var(--accent)] text-base',
                }"
              />
            </div>

            <div>
              <label class="mb-2 block text-xl text-[var(--primary-deep)]"
                >Email</label
              >
              <UInput
                :model-value="user?.email || ''"
                type="email"
                readonly
                size="xl"
                :ui="{
                  base: 'w-full rounded-xl border-transparent bg-[var(--muted)] text-[#5C6B5E] text-base',
                }"
              />
            </div>

            <div>
              <label class="mb-2 block text-xl text-[var(--primary-deep)]"
                >Cidade</label
              >
              <UInput
                v-model="form.location"
                placeholder="Ex: Braga"
                size="xl"
                :ui="{
                  base: 'w-full rounded-xl border-transparent bg-[var(--muted)] focus:border-[var(--accent)] text-base',
                }"
              />
            </div>

            <div>
              <label class="mb-2 block text-xl text-[var(--primary-deep)]"
                >Biografia</label
              >
              <UTextarea
                v-model="form.bio"
                :rows="3"
                placeholder="Fala um pouco sobre ti"
                size="xl"
                autoresize
                :ui="{
                  base: 'w-full rounded-xl border-transparent bg-[var(--muted)] focus:border-[var(--accent)] text-base',
                }"
              />
            </div>

            <div>
              <label class="mb-2 block text-xl text-[var(--primary-deep)]"
                >Tipo de conta</label
              >
              <USelectMenu
                v-model="form.accountType"
                :options="accountTypes"
                value-attribute="value"
                option-attribute="label"
                size="xl"
                class="w-full"
              />
            </div>

            <div class="pt-2">
              <UButton
                type="submit"
                :loading="isLoading"
                class="rounded-xl bg-[var(--accent)] px-6 py-3 text-[var(--primary-deep)] hover:opacity-90 transition-opacity"
              >
                Guardar alterações
              </UButton>
            </div>
          </form>
        </div>

        <div
          class="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm"
        >
          <h2
            class="mb-6 font-serif text-4xl font-semibold text-[var(--primary-deep)]"
          >
            Preferências
          </h2>

          <div class="space-y-4 text-lg">
            <label class="flex items-center justify-between gap-3">
              <span>Receber notificações por email</span>
              <input
                v-model="form.allowEmailNotifications"
                type="checkbox"
                class="h-5 w-5"
              />
            </label>
            <label class="flex items-center justify-between gap-3">
              <span>Mostrar localização nas trocas</span>
              <input
                v-model="form.showLocation"
                type="checkbox"
                class="h-5 w-5"
              />
            </label>
            <label class="flex items-center justify-between gap-3">
              <span>Permitir propostas de troca</span>
              <input
                v-model="form.allowProposals"
                type="checkbox"
                class="h-5 w-5"
              />
            </label>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
