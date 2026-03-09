import { Agency } from '../../types';
import { supabase } from './supabaseClient';

/**
 * Parses the current hostname to find a subdomain/slug.
 * Ex: william.comissone.com.br -> william
 * Ex: localhost:5173 -> null
 */
export function getSubdomain(): string | null {
    const hostname = window.location.hostname;

    // Ignore direct IP, localhost, or production root
    if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === 'comissone.com.br' ||
        hostname.endsWith('.vercel.app') && hostname.split('.').length === 3 // root vercel
    ) {
        return null;
    }

    // Split and get the first part
    const parts = hostname.split('.');
    if (parts.length >= 3) {
        return parts[0];
    }

    return null;
}

/**
 * Fetches agency settings by slug
 */
export async function fetchAgencyBySlug(slug: string): Promise<Agency | null> {
    try {
        const { data, error } = await supabase
            .from('agencies')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error) return null;
        return data as Agency;
    } catch {
        return null;
    }
}
