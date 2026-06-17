import { supabase } from './supabase';

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
}

export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    try {
      // Supabase uses email/password. We'll map username to a fake email format
      const email = `${username}@gpib.org`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { 
          success: false, 
          message: 'Username atau Password salah.' 
        };
      }

      localStorage.setItem('isGPBAdmin', 'true');
      localStorage.setItem('adminToken', data.session?.access_token || 'true');
      return { 
        success: true, 
        token: data.session?.access_token 
      };
    } catch (err) {
      console.error(err);
      return { 
        success: false, 
        message: 'Gagal menghubungkan ke server. Periksa koneksi internet Anda.' 
      };
    }
  },
  
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem('isGPBAdmin');
    localStorage.removeItem('adminToken');
  },
  
  isAuthenticated: (): boolean => {
    return localStorage.getItem('isGPBAdmin') === 'true';
  }
};
