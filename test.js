import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://wzwwopifwhijewbmyywz.supabase.co', 'sb_publishable_ZaSAPkaTIBw_P9S18KmGDg_OmpJVQjB');

async function test() {
    const payload = {
     VocabularyId: 482717,
     KanjiId: 27814,
     Order: 0
  };
  
  const res = await supabase.from('KanjiComponents').insert(payload);
  console.log('Insert Result:', res);
}
test();
