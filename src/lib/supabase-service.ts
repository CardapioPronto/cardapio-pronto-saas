
import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

// Interface genérica para respostas do serviço
interface ServiceResponse<T> {
  data: T | null;
  error: PostgrestError | Error | null;
}

// Type for valid table names
type TableNames = keyof Database['public']['Tables'];

// Generic type for table rows
type TableRow<T extends TableNames> = Database['public']['Tables'][T]['Row'];
type TableInsert<T extends TableNames> = Database['public']['Tables'][T]['Insert'];
type TableUpdate<T extends TableNames> = Database['public']['Tables'][T]['Update'];
type FilterValue = string | number | boolean | null;
type SupabaseQuery = ReturnType<typeof supabase.from>;
type CustomQueryResult = {
  data: unknown;
  error: PostgrestError | Error | null;
};

// Classe de serviço genérico para CRUD no Supabase
export class SupabaseService<T extends TableNames> {
  private table: T;

  constructor(tableName: T) {
    this.table = tableName;
  }

  /**
   * Cria um novo registro na tabela
   */
  async create<R extends TableRow<T>>(data: TableInsert<T>): Promise<ServiceResponse<R>> {
    try {
      const { data: result, error } = await (supabase
        .from(this.table) as any)
        .insert(data as never)
        .select()
        .single();

      return { data: result as unknown as R, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Busca todos os registros da tabela com filtros opcionais
   */
  async getAll<R extends TableRow<T>>(
    filters?: { column: string; value: FilterValue }[],
    options?: { limit?: number; offset?: number; orderBy?: { column: string; ascending?: boolean } }
  ): Promise<ServiceResponse<R[]>> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase.from(this.table).select('*');

      // Aplicar filtros se fornecidos
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          query = query.eq(filter.column, filter.value);
        });
      }

      // Aplicar opções se fornecidas
      if (options) {
        if (options.limit) query = query.limit(options.limit);
        if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
        if (options.orderBy) {
          query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
        }
      }

      const { data, error } = await query;
      return { data: data as unknown as R[], error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Busca um registro específico por ID
   */
  async getById<R extends TableRow<T>>(id: string | number): Promise<ServiceResponse<R>> {
    try {
      const { data, error } = await (supabase
        .from(this.table) as any)
        .select('*')
        .eq('id', id)
        .single();

      return { data: data as unknown as R, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Atualiza um registro existente
   */
  async update<R extends TableRow<T>>(id: string | number, data: TableUpdate<T>): Promise<ServiceResponse<R>> {
    try {
      const { data: result, error } = await (supabase
        .from(this.table) as any)
        .update(data as never)
        .eq('id', id)
        .select()
        .single();

      return { data: result as unknown as R, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Remove um registro da tabela
   */
  async delete(id: string | number): Promise<ServiceResponse<null>> {
    try {
      const { error } = await (supabase
        .from(this.table) as any)
        .delete()
        .eq('id', id);

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Executa uma consulta personalizada
   */
  async customQuery<R>(
    queryFn: (query: SupabaseQuery) => Promise<CustomQueryResult> | CustomQueryResult,
  ): Promise<ServiceResponse<R>> {
    try {
      const query = supabase.from(this.table);
      const { data, error } = await queryFn(query);
      return { data: data as unknown as R, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

// Função para verificar a conexão com o Supabase
export async function checkSupabaseConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    // Usa uma tabela com leitura pública para o health-check, evitando políticas complexas (RLS)
    const { error } = await supabase
      .from('menu_themes' as TableNames)
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Erro na conexão com o Supabase:', error.message);
      return { connected: false, error: error.message };
    }
    
    return { connected: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Falha ao conectar ao Supabase:', errorMessage);
    return { connected: false, error: errorMessage };
  }
}

// Serviços específicos pré-configurados para as entidades principais
export const restaurantsService = new SupabaseService<'restaurants'>('restaurants');
export const productsService = new SupabaseService<'products'>('products');
export const ordersService = new SupabaseService<'orders'>('orders');
export const orderItemsService = new SupabaseService<'order_items'>('order_items');
