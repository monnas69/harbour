import { supabase } from '../lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('test').select('*')
  
  return (
    <main>
      <h1>Harbour</h1>
      <p>Supabase connected: {error ? 'No — ' + error.message : 'Yes'}</p>
    </main>
  )
}