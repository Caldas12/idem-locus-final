<script setup>
import { computed, ref, watch } from "vue";

const user = useSupabaseUser();
const supabase = useSupabaseClient();

const mobileMenuOpen = ref(false);
const unreadNotifications = ref(0);

const { data: profile } = await useAsyncData(
  "layout-profile",
  async () => {
    if (!user.value?.id) return null;

    const { data } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.value.id)
      .maybeSingle();

    return data || null;
  },
  { watch: [() => user.value?.id] },
);

const isAdmin = computed(() => profile.value?.role === "admin");

watch(
  () => user.value?.id,
  async (userId) => {
    mobileMenuOpen.value = false;

    if (!userId) {
      unreadNotifications.value = 0;
      return;
    }

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    unreadNotifications.value = count || 0;
  },
  { immediate: true },
);

async function logout() {
  await supabase.auth.signOut();
  mobileMenuOpen.value = false;
  navigateTo("/login");
}
</script>

<template>
  <div class="min-h-screen bg-[var(--background)]">
    <header
      class="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-gradient-to-r from-[#1F453A] to-[#153229] text-[#F5EDD8] shadow-sm"
    >
      <div class="idem-container flex h-16 items-center justify-between gap-4">
        <NuxtLink to="/" class="flex shrink-0 items-center gap-2">
          <UIcon
            name="i-lucide-repeat-2"
            class="h-5 w-5 text-[var(--accent)]"
          />
          <span class="font-serif text-2xl font-semibold tracking-tight"
            >Idem Locus</span
          >
        </NuxtLink>

        <nav class="hidden items-center gap-8 text-base text-[#E3E7DF] md:flex">
          <NuxtLink to="/search" class="transition-opacity hover:opacity-90"
            >Explorar</NuxtLink
          >
          <NuxtLink
            to="/pickup-points"
            class="transition-opacity hover:opacity-90"
            >Pontos de Recolha</NuxtLink
          >
          <NuxtLink
            v-if="user"
            to="/dashboard"
            class="transition-opacity hover:opacity-90"
            >Painel</NuxtLink
          >
          <NuxtLink
            v-if="isAdmin"
            to="/admin"
            class="transition-opacity hover:opacity-90"
            >Admin</NuxtLink
          >
        </nav>

        <div class="hidden items-center gap-4 md:flex">
          <template v-if="user">
            <NuxtLink to="/favorites" class="text-[#E3E7DF] hover:text-white">
              <UIcon name="i-lucide-heart" class="h-5 w-5" />
            </NuxtLink>

            <NuxtLink
              to="/notifications"
              class="relative text-[#E3E7DF] hover:text-white"
            >
              <UIcon name="i-lucide-bell" class="h-5 w-5" />
              <span
                v-if="unreadNotifications > 0"
                class="absolute -right-2 -top-2 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--primary-deep)]"
              >
                {{ unreadNotifications }}
              </span>
            </NuxtLink>

            <UDropdownMenu
              :items="[
                {
                  label: 'Painel',
                  to: '/dashboard',
                  icon: 'i-lucide-layout-dashboard',
                },
                {
                  label: 'O Meu Perfil',
                  to: '/account',
                  icon: 'i-lucide-user',
                },
                { type: 'separator' },
                {
                  label: 'Terminar sessão',
                  icon: 'i-lucide-log-out',
                  onSelect: logout,
                },
              ]"
              :content="{ align: 'end' }"
              :ui="{ content: 'w-48' }"
            >
              <button
                type="button"
                class="flex items-center text-[#E3E7DF] hover:text-white transition-colors outline-none"
              >
                <UIcon name="i-lucide-user" class="h-5 w-5" />
              </button>
            </UDropdownMenu>

            <UButton
              to="/publish"
              class="rounded-full bg-[var(--accent)] px-6 py-2 text-[var(--primary-deep)] hover:opacity-90"
            >
              Publicar
            </UButton>
          </template>

          <template v-else>
            <UButton
              to="/login"
              variant="ghost"
              class="rounded-full px-4 text-[#F5EDD8] hover:bg-white/10"
            >
              Entrar
            </UButton>
            <UButton
              to="/register"
              class="rounded-full bg-[var(--accent)] px-6 py-2 text-[var(--primary-deep)] hover:opacity-90"
            >
              Publicar
            </UButton>
          </template>
        </div>

        <button
          type="button"
          class="md:hidden"
          aria-label="Abrir menu"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <UIcon
            :name="mobileMenuOpen ? 'i-lucide-x' : 'i-lucide-menu'"
            class="h-6 w-6"
          />
        </button>
      </div>

      <div
        v-if="mobileMenuOpen"
        class="border-t border-white/10 bg-[#16352D] px-6 py-4 md:hidden"
      >
        <div class="flex flex-col gap-3 text-sm text-[#E3E7DF]">
          <NuxtLink to="/search" @click="mobileMenuOpen = false"
            >Explorar</NuxtLink
          >
          <NuxtLink to="/pickup-points" @click="mobileMenuOpen = false"
            >Pontos de Recolha</NuxtLink
          >
          <NuxtLink v-if="user" to="/dashboard" @click="mobileMenuOpen = false"
            >Painel</NuxtLink
          >
          <NuxtLink v-if="isAdmin" to="/admin" @click="mobileMenuOpen = false"
            >Admin</NuxtLink
          >
          <NuxtLink v-if="user" to="/favorites" @click="mobileMenuOpen = false"
            >Favoritos</NuxtLink
          >
          <NuxtLink
            v-if="user"
            to="/notifications"
            @click="mobileMenuOpen = false"
            >Notificações</NuxtLink
          >
          <NuxtLink v-if="user" to="/account" @click="mobileMenuOpen = false"
            >Perfil</NuxtLink
          >
          <NuxtLink to="/publish" @click="mobileMenuOpen = false"
            >Publicar</NuxtLink
          >
          <button
            v-if="user"
            type="button"
            class="w-fit text-left"
            @click="logout"
          >
            Terminar sessão
          </button>
        </div>
      </div>
    </header>

    <main class="min-h-screen pt-16">
      <slot />
    </main>
  </div>
</template>
