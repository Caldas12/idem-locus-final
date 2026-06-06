// app/composables/useSeller.ts
export const useSeller = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // 1. Ir buscar os produtos do utilizador logado
  const getMyProducts = async () => {
    if (!user.value) return []
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, title, description, image, condition, type, status, category_id, expires_at, created_at'
      )
      .eq('profile_id', user.value.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // 2. Apagar um produto
  const removeProduct = async (productId: number) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('profile_id', user.value.id)

    if (error) throw error
  }

  // 3. Atualizar o estado rápido (Disponível/Esgotado)
  const updateQuickStatus = async (productId: number, newStatus: string) => {
    const { error } = await supabase
      .from('products')
      .update({ status: newStatus })
      .eq('id', productId)
      .eq('profile_id', user.value.id)

    if (error) throw error
  }

  return {
    getMyProducts,
    removeProduct,
    updateQuickStatus
  }
}
