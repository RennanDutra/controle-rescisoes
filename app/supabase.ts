import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://loxglinjlzxgonrcyxjk.supabase.co";
const supabaseKey = "sb_publishable_D3x2aglnhZorDf49AqlCKQ__cP821G4";

export const supabase = createClient(supabaseUrl, supabaseKey);