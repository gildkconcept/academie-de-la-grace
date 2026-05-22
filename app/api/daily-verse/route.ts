import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Chercher le verset programmé pour aujourd'hui
    const { data: verse, error } = await supabase
      .from('daily_verse')
      .select('*')
      .eq('displayed_date', today)
      .eq('is_active', true)
      .maybeSingle()
    
    if (error) {
      console.error('Erreur:', error)
      return NextResponse.json({ verse: null })
    }
    
    
    if (!verse) {
      const { data: lastVerse } = await supabase
        .from('daily_verse')
        .select('*')
        .eq('is_active', true)
        .order('displayed_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      return NextResponse.json({ verse: lastVerse || null })
    }
    
    return NextResponse.json({ verse })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ verse: null })
  }
}