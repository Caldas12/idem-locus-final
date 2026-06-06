// app/composables/useProducts.ts
export const useProducts = () => {
  const supabase = useSupabaseClient()

  const getFeedProducts = async (
    from: number,
    to: number,
    locationFilter?: string
  ) => {
    let query = supabase
      .from('products')
      .select(
        'id, title, description, image, condition, type, status, created_at, category_id, profiles!inner(name, location), categories(name)',
        { count: 'exact' }
      )
      .eq('status', 'Disponível')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (locationFilter && locationFilter.trim() !== '') {
      query = query.ilike('profiles.location', `%${locationFilter.trim()}%`)
    }

    const { data, count, error } = await query

    if (error) {
      console.error('Erro ao buscar produtos:', error)
      throw error
    }

    return {
      products: data || [],
      totalCount: count || 0
    }
  }

  return {
    getFeedProducts
  }
}
