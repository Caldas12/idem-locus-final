<template>
  <footer class="bg-[#14392E] text-[#D9E3DD] mt-20">
    <UContainer class="py-16">
      <div class="grid md:grid-cols-4 gap-12">
        <!-- Logo -->
        <div class="md:col-span-2">
          <h3 class="text-3xl font-serif font-bold text-[#F5EFE3]">
            Idem Locus
          </h3>

          <p class="mt-4 text-lg text-[#D9E3DD] max-w-md">
            Conectando comunidades através da partilha de excedentes
            alimentares.
          </p>
        </div>

        <!-- Plataforma -->
        <div>
          <h4 class="font-semibold text-white mb-4">
            Plataforma
          </h4>

          <ul class="space-y-2">
            <li>
              <NuxtLink to="/"> Explorar </NuxtLink>
            </li>

            <li>
              <NuxtLink to="/publish"> Publicar </NuxtLink>
            </li>

            <li>
              <NuxtLink to="/dashboard"> Dashboard </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Legal -->
        <div>
          <h4 class="font-semibold text-white mb-4">
            Legal
          </h4>

          <ul class="space-y-2">
            <li>Termos</li>
            <li>Privacidade</li>
          </ul>
        </div>
      </div>

      <div class="border-t border-white/10 mt-12 pt-8">
        <p class="text-center text-sm text-[#B8C3BC]">
          © {{ new Date().getFullYear() }} Idem Locus. Projeto académico
          desenvolvido no âmbito da Licenciatura em Engenharia Informática.
        </p>
      </div>
    </UContainer>
  </footer>
</template>
