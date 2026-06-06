<script setup lang="ts">
useHead({
  title: 'Política de Privacidade'
})
</script>

<template>
  <UContainer class="py-10 max-w-3xl space-y-8">
    <div>
      <h1 class="text-3xl font-bold text-stone-900">
        Política de Privacidade
      </h1>
      <p class="text-stone-500 mt-2">
        A transparência e o tratamento dos dados na plataforma Idem Locus.
      </p>
    </div>

    <UCard>
      <div class="space-y-6 text-stone-700">
        <section>
          <h2 class="text-xl font-semibold text-stone-900 mb-2">
            1. Informação Recolhida
          </h2>
          <p>
            Durante a utilização da plataforma, procedemos à recolha de dados de perfil (nome e localidade de forma pública) e de credenciais de acesso de forma segura através do nosso fornecedor de autenticação.
          </p>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-stone-900 mb-2">
            2. Utilização da Informação
          </h2>
          <p>
            Os dados recolhidos destinam-se em exclusivo a:
          </p>
          <ul class="list-disc pl-5 mt-2 space-y-1">
            <li>Garantir o contacto local e a proximidade entre utilizadores;</li>
            <li>Fornecer métricas anónimas relativas ao impacto ambiental e à redução do desperdício alimentar;</li>
            <li>Assegurar a moderação e segurança da comunidade.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-xl font-semibold text-stone-900 mb-2">
            3. Retenção e Eliminação de Dados
          </h2>
          <p>
            Ao solicitar a eliminação da conta, todos os dados de identificação pessoal e os respetivos anúncios em estado ativo são permanentemente apagados do sistema. As transações finalizadas transitam para um estado anónimo e irrecuperável, sendo mantidas isoladamente para registo de métricas da plataforma.
          </p>
        </section>
      </div>
    </UCard>
  </UContainer>
</template>
