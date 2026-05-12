import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as adminService from './admin-service.tsx';
import * as kv from './kv_store.tsx';

/**
 * Initialize Default Admin User
 * Creates a test admin user with username "admin" and password "admin"
 */

const TEST_ADMIN_EMAIL = 'admin@amtdistro.com';
const TEST_ADMIN_PASSWORD = 'admin';
const TEST_ADMIN_USERNAME = 'admin';

export async function initializeDefaultAdmin() {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Starting admin user initialization...');

    // Check if test admin user already exists in Supabase Auth
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingAdmin = existingUsers?.users?.find(u => u.email === TEST_ADMIN_EMAIL);

    let adminUserId: string;

    if (existingAdmin) {
      console.log('✅ Test admin user already exists in Supabase Auth');
      adminUserId = existingAdmin.id;
      
      // Ensure all mappings exist (in case of partial initialization)
      const userProfile = await kv.get(`user:${adminUserId}`);
      if (!userProfile) {
        // Create missing profile
        const profile = {
          id: adminUserId,
          userId: adminUserId,
          email: TEST_ADMIN_EMAIL,
          artistName: 'System Administrator',
          username: TEST_ADMIN_USERNAME,
          role: 'admin',
          subscriptionTier: 'artist',
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await kv.set(`user:${adminUserId}`, profile);
        await kv.set(`user:email:${TEST_ADMIN_EMAIL}`, adminUserId);
        await kv.set(`user:username:${TEST_ADMIN_USERNAME}`, adminUserId);
        await kv.set(`user:userId:${adminUserId}`, adminUserId);
        await kv.set(`user:role:admin:${adminUserId}`, true);
        console.log('✅ Admin user profile created in KV store');
      } else {
        // Ensure userId mapping exists
        const userIdMapping = await kv.get(`user:userId:${adminUserId}`);
        if (!userIdMapping) {
          await kv.set(`user:userId:${adminUserId}`, adminUserId);
          console.log('✅ Fixed missing userId mapping');
        }
      }
    } else {
      // Create the test admin user in Supabase Auth
      console.log('📝 Creating test admin user in Supabase Auth...');
      const { data, error } = await supabase.auth.admin.createUser({
        email: TEST_ADMIN_EMAIL,
        password: TEST_ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          artistName: 'System Administrator',
          username: TEST_ADMIN_USERNAME,
        },
      });

      if (error) {
        console.error('❌ Error creating test admin user:', error);
        throw error;
      }

      if (!data.user) {
        console.error('❌ No user data returned');
        throw new Error('No user data returned from Supabase');
      }

      adminUserId = data.user.id;
      console.log('✅ Test admin user created in Supabase Auth:', adminUserId);

      // Small delay to ensure user is fully created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create user profile in KV store
      const userProfile = {
        id: adminUserId,
        userId: adminUserId,
        email: TEST_ADMIN_EMAIL,
        artistName: 'System Administrator',
        username: TEST_ADMIN_USERNAME,
        role: 'admin',
        subscriptionTier: 'artist',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await kv.set(`user:${adminUserId}`, userProfile);
      await kv.set(`user:email:${TEST_ADMIN_EMAIL}`, adminUserId);
      await kv.set(`user:username:${TEST_ADMIN_USERNAME}`, adminUserId);
      await kv.set(`user:userId:${adminUserId}`, adminUserId); // Fix: Add this mapping
      await kv.set(`user:role:admin:${adminUserId}`, true);
      console.log('✅ Test admin user profile created in KV store');
    }

    // Check if admin record exists
    const existingAdminRecord = await kv.get(`admin:user:${adminUserId}`);

    if (existingAdminRecord) {
      console.log('✅ Test admin record already exists');
      console.log('');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║          ADMIN ALREADY INITIALIZED                     ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log('║  Username: admin                                       ║');
      console.log('║  Email:    admin@amtdistro.com                        ║');
      console.log('║  Password: admin                                       ║');
      console.log('║  Role:     Super Admin                                ║');
      console.log('╠════════════════════════════════════════════════════════╣');
      console.log('║  Access:   http://localhost:5173/#login               ║');
      console.log('╚════════════════════════════════════════════════════════╝');
      console.log('');
      return;
    }

    // Create admin record with superadmin role
    console.log('📝 Creating admin record with superadmin role...');
    await adminService.createAdminUser(
      adminUserId,
      'superadmin',
      'system',
      'System Administration'
    );

    console.log('✅ Test admin user initialized successfully!');
    console.log('');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║          TEST ADMIN CREDENTIALS                        ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Username: admin                                       ║');
    console.log('║  Email:    admin@amtdistro.com                        ║');
    console.log('║  Password: admin                                       ║');
    console.log('║  Role:     Super Admin                                ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║  Access:   http://localhost:5173/#login               ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('');
  } catch (error) {
    console.error('❌ Error initializing default admin:', error);
    throw error;
  }
}

// Check if admin needs initialization
export async function checkAndInitializeAdmin() {
  try {
    // Check if any admin users exist
    const adminKeys = await kv.getByPrefix('admin:user:');
    
    if (adminKeys.length === 0) {
      console.log('No admin users found. Initializing default admin...');
      await initializeDefaultAdmin();
    } else {
      console.log(`✅ ${adminKeys.length} admin user(s) already exist`);
    }
  } catch (error) {
    console.error('Error checking admin initialization:', error);
  }
}