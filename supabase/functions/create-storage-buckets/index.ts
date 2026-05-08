
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function requireSuperAdmin(req: Request, supabaseClient: ReturnType<typeof createClient>) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return false

  const { data: authData } = await supabaseClient.auth.getUser(token)
  if (!authData.user) return false

  const { data: isSuperAdmin } = await supabaseClient.rpc('is_super_admin', {
    user_id: authData.user.id,
  })

  return !!isSuperAdmin
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    })
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Service role is required because bucket setup is an administrative action.
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    if (!(await requireSuperAdmin(req, supabaseClient))) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para executar setup de storage' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        },
      )
    }

    // Verifica se o bucket já existe
    const { data: existingBuckets, error: listError } = await supabaseClient
      .storage
      .listBuckets()

    console.log('Existing buckets:', existingBuckets)
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      throw listError
    }

    // Criar bucket se não existir
    const bucketName = 'restaurant-assets'
    
    if (!existingBuckets?.find(bucket => bucket.name === bucketName)) {
      console.log(`Creating bucket: ${bucketName}`)
      
      const { error: createError } = await supabaseClient
        .storage
        .createBucket(bucketName, {
          public: true,
          fileSizeLimit: 1024 * 1024 * 2, // 2MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp']
        })
      
      if (createError) {
        console.error('Error creating bucket:', createError)
        throw createError
      }
      
      console.log(`Bucket ${bucketName} created successfully`)
    } else {
      console.log(`Bucket ${bucketName} already exists`)
    }

    return new Response(
      JSON.stringify({ message: 'Storage buckets setup completed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error setting up storage buckets:', error)
    
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
