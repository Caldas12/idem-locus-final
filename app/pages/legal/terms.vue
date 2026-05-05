<script setup lang="ts">
useHead({
  title: 'Termos de Serviço'
})
</script>

<template>
  <UContainer class="py-10 max-w-3xl space-y-8">
    <div>
      <h1 class="text-3xl font-bold text-stone-900">
        Termos de Serviço
      </h1>
      <p class="text-stone-500 mt-2">
        Regras de utilização da comunidade Idem Locus.
      </p>
    </div>

    <UCard>
      <div class="space-y-6 text-stone-700">
        <section>
          <h2 class="text-xl font-semibold text-stone-900 mb-2">1. Elegibilidade e Conduta</h2>
          <p>
            A plataforma Idem Locus destina-se a facilitar a troca de excedentes alimentares e mitigar o desperdício alimentar. Os utilizadores comprometem-se a publicar apenas bens próprios para consumo, a respeitar a veracidade das informações submetidas (como validade e estado físico do produto) e a manter um comportamento cordial no chat.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-stone-900 mb-2">2. Responsabilidade do Produto</h2>
          <p>
            O Idem Locus opera unicamente como intermediário digital de comunicação. A avaliação do estado de segurança e consumo de um bem transacionado, bem como as declarações de alergénios, são da exclusiva responsabilidade do produtor ou vendedor que submete o anúncio.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-stone-900 mb-2">3. Moderação</h2>
          <p>
            A administração da plataforma reserva o direito de suspender temporariamente ou banir de forma definitiva qualquer conta cuja conduta se verifique contrária a estes termos, nomeadamente através de práticas abusivas, fraude ou perigo de saúde pública.
          </p>
        </section>
      </div>
    </UCard>
  </UContainer>
</template>
