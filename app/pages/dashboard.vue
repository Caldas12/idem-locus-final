<template>
  <UContainer class="py-10 space-y-12">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-200 pb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 font-serif">O Meu Dashboard</h1>
        <p class="text-gray-500 mt-1">Gere os teus produtos e responde às propostas da comunidade.</p>
      </div>
      <UButton to="/publish" color="amber" icon="i-heroicons-plus" size="lg" class="bg-[#C5893C] hover:bg-[#A87431]">
        Publicar Novo
      </UButton>
    </div>

    <UAlert v-if="errorMessage" color="red" variant="soft" :title="errorMessage" />
    <UAlert v-if="successMessage" color="green" variant="soft" :title="successMessage" />

    <section>
      <h2 class="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-inbox-arrow-down" class="text-[#C5893C]" /> Propostas Recebidas
      </h2>
      <div v-if="!_detailedProposals || _detailedProposals.length === 0" class="text-center py-8 bg-white rounded-xl border border-stone-200 shadow-sm">
        <p class="text-stone-500">Ainda não recebeste nenhuma manifestação de interesse.</p>
      </div>
      <div v-else class="space-y-4">
        <UCard v-for="prop in _detailedProposals" :key="prop.id" class="shadow-sm border-stone-200">
          <div class="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <p class="font-bold text-stone-900 text-lg">{{ prop.product?.title || 'Produto Removido' }}</p>
              <p class="text-sm text-stone-600 flex items-center gap-1 mt-1">
                <UIcon name="i-heroicons-user" /> De: <strong>{{ prop.buyer?.name || 'Utilizador' }}</strong>
              </p>
              <UBadge :color="prop.status === 'pending' ? 'amber' : prop.status === 'accepted' ? 'green' : 'gray'" class="mt-2 uppercase tracking-wider text-[10px]">
                {{ prop.status === 'pending' ? 'Pendente' : prop.status === 'accepted' ? 'Aceite' : prop.status === 'completed' ? 'Concluída' : 'Rejeitada' }}
              </UBadge>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton :to="`/inbox/${prop.conversation_id}`" color="stone" variant="soft" icon="i-heroicons-chat-bubble-left-ellipsis">Chat</UButton>

              <template v-if="prop.status === 'pending'">
                <UButton color="green" @click="_updateProposal(prop, 'accepted')" :loading="isUpdatingProposal" icon="i-heroicons-check">Aceitar</UButton>
                <UButton color="red" variant="soft" @click="_updateProposal(prop, 'rejected')" :loading="isUpdatingProposal" icon="i-heroicons-x-mark">Rejeitar</UButton>
              </template>

              <template v-else-if="prop.status === 'accepted'">
                <UButton color="amber" @click="_updateProposal(prop, 'completed')" :loading="isUpdatingProposal" icon="i-heroicons-check-circle" class="bg-[#C5893C] text-white">
                  Marcar como Entregue
                </UButton>
              </template>
            </div>
          </div>
        </UCard>
      </div>
    </section>

    <section>
      <h2 class="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-squares-2x2" class="text-[#C5893C]" /> Os Meus Produtos
      </h2>
      <div v-if="!_myProducts || _myProducts.length === 0" class="text-center py-12 bg-white rounded-xl border border-stone-200 shadow-sm">
        <p class="text-stone-500">Ainda não publicaste nenhum produto.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <UCard v-for="product in _myProducts" :key="product.id" class="flex flex-col h-full overflow-hidden shadow-sm hover:shadow-md transition-shadow border-stone-200" :ui="{ body: { padding: 'p-0 sm:p-0' } }">

          <template v-if="editingProductId !== product.id">
            <div class="h-48 bg-[#FAF9F6] flex items-center justify-center border-b border-stone-100 overflow-hidden relative">
              <img v-if="product.image && product.image.startsWith('http')" :src="product.image" class="w-full h-full object-cover" />
              <span v-else class="text-6xl">{{ product.image || '📦' }}</span>
              <UBadge class="absolute top-2 left-2 shadow-sm font-bold" :color="product.status === 'Disponível' ? 'green' : 'red'">{{ product.status }}</UBadge>
            </div>

            <div class="p-5 flex-1 flex flex-col">
              <h3 class="font-bold text-lg text-stone-900 line-clamp-1 mb-1">{{ product.title }}</h3>
              <p class="text-sm text-stone-500 line-clamp-2 mb-4 flex-1">{{ product.description }}</p>

              <div class="flex gap-2 mt-auto pt-4 border-t border-stone-100">
                <UButton class="flex-1 justify-center font-bold" size="sm" color="amber" variant="soft" icon="i-heroicons-pencil" @click="_openEdit(product)">Editar</UButton>
                <UButton size="sm" color="red" variant="ghost" icon="i-heroicons-trash" @click="_removeProduct(product.id)" />
              </div>
            </div>
          </template>

          <template v-else>
            <div class="p-4 bg-amber-50 h-full flex flex-col space-y-3">
              <div class="flex items-center gap-2 border-b border-amber-200 pb-2">
                <UIcon name="i-heroicons-pencil-square" class="text-amber-700 text-lg" />
                <h3 class="font-bold text-amber-900 text-sm">Editar Anúncio</h3>
              </div>

              <UInput v-model="editForm.title" placeholder="Título" size="sm" class="bg-white" />
              <UTextarea v-model="editForm.description" placeholder="Descrição" size="sm" :rows="2" autoresize class="bg-white" />
              <UInput v-model="editForm.image" placeholder="URL Imagem ou Emoji" size="sm" class="bg-white" />

              <div class="grid grid-cols-2 gap-2">
                <USelect v-model="editForm.status" :options="statusOptions" size="sm" class="bg-white" />
                <USelect v-model="editForm.condition" :options="conditionOptions" size="sm" class="bg-white" />
              </div>

              <div class="flex gap-2 mt-auto pt-2 border-t border-amber-200">
                <UButton class="flex-1 justify-center font-bold" size="sm" color="green" @click="saveEdit" :loading="isSaving">Guardar</UButton>
                <UButton size="sm" color="stone" variant="ghost" @click="cancelEdit">X</UButton>
              </div>
            </div>
          </template>

        </UCard>
      </div>
    </section>
  </UContainer>
</template>
