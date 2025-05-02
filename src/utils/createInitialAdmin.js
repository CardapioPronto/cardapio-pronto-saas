
// Utility script to create the initial Super Admin user
import { createClient } from '@supabase/supabase-js';

// Connect to Supabase
const supabaseUrl = 'https://jyrfjvyeikhqpuwcvdff.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createInitialAdmin() {
  try {
    // Create the user
    const email = 'juniorfalcao.jc@gmail.com';
    const password = 'jrfalcao@123456';
    
    console.log(`Creating super admin user: ${email}`);
    
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'super_admin'
      }
    });
    
    if (userError) {
      throw userError;
    }
    
    console.log(`User created successfully with ID: ${userData.user.id}`);
    
    // Add to system_admins table
    const { error: adminError } = await supabase
      .from('system_admins')
      .insert({
        user_id: userData.user.id,
        notes: 'Admin inicial do sistema'
      });
    
    if (adminError) {
      throw adminError;
    }
    
    console.log('User added to system_admins table successfully');
    
    // Log the action
    await supabase
      .rpc('log_admin_activity', {
        admin_id: userData.user.id,
        action: 'create_initial_admin',
        entity_type: 'system_admins',
        entity_id: userData.user.id,
        details: { email }
      });
    
    console.log('Initial Super Admin created successfully!');
  } catch (error) {
    console.error('Error creating initial Super Admin:', error);
  }
}

createInitialAdmin();
