import { createClient } from "@supabase/supabase-js";

// Use REACT_APP_ prefixed environment variables for frontend
const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = (url && key) 
  ? createClient(url, key, { auth: { persistSession: false } }) 
  : null;

export async function logImportRun(row: any) {
  if (!supabase) return;
  await supabase.from("import_runs").insert(row);
}

export async function logImportEvent(evt: any) {
  if (!supabase) return;
  await supabase.from("import_run_events").insert(evt);
}

export async function uploadRawCSV(path: string, buf: Buffer, contentType = "text/csv") {
  if (!supabase) return { path };
  const bucket = process.env.SUPABASE_UPLOADS_BUCKET || "uploads";
  await supabase.storage.from(bucket).upload(path, buf, { upsert: true, contentType });
  return { path };
}

export async function saveCSVData(csvData: any) {
  if (!supabase) {
    console.log('Supabase not available, saving to localStorage only');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('csv_data')
      .insert([csvData])
      .select();
    
    if (error) {
      console.error('Error saving CSV data to Supabase:', error);
      return null;
    }
    
    console.log('CSV data saved to Supabase:', data);
    return data[0];
  } catch (error) {
    console.error('Error saving CSV data:', error);
    return null;
  }
}

export async function getCSVData() {
  if (!supabase) {
    console.log('Supabase not available, reading from localStorage only');
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('csv_data')
      .select('*')
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching CSV data from Supabase:', error);
      return [];
    }
    
    console.log('CSV data fetched from Supabase:', data);
    return data || [];
  } catch (error) {
    console.error('Error fetching CSV data:', error);
    return [];
  }
}

export async function deleteCSVData(csvId: string) {
  if (!supabase) {
    console.log('Supabase not available, deleting from localStorage only');
    return null;
  }
  
  try {
    const { error } = await supabase
      .from('csv_data')
      .update({ is_active: false })
      .eq('id', csvId);
    
    if (error) {
      console.error('Error deleting CSV data from Supabase:', error);
      return null;
    }
    
    console.log('CSV data deleted from Supabase:', csvId);
    return true;
  } catch (error) {
    console.error('Error deleting CSV data:', error);
    return null;
  }
}

// AI Learning Functions
export async function saveAILearning(fileType: string, accountName: string, userCategory: string) {
  if (!supabase) {
    console.log('Supabase not available, cannot save AI learning');
    return null;
  }
  
  try {
    const { error } = await supabase
      .from('ai_learning')
      .upsert({
        file_type: fileType,
        account_name: accountName,
        user_category: userCategory,
        confidence_score: 1.0,
        usage_count: 1,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'file_type,account_name'
      });
    
    if (error) {
      console.error('Error saving AI learning:', error);
      return null;
    }
    
    console.log('✅ AI learning saved:', { fileType, accountName, userCategory });
    return true;
  } catch (error) {
    console.error('Error saving AI learning:', error);
    return null;
  }
}

export async function getAILearning(fileType: string) {
  if (!supabase) {
    console.log('Supabase not available, cannot get AI learning');
    return {};
  }
  
  try {
    const { data, error } = await supabase
      .from('ai_learning')
      .select('account_name, user_category, confidence_score, usage_count')
      .eq('file_type', fileType);
    
    if (error) {
      console.error('Error getting AI learning:', error);
      return {};
    }
    
    // Convert array to object for easy lookup
    const learningData: Record<string, string> = {};
    data?.forEach((item: any) => {
      learningData[item.account_name] = item.user_category;
    });
    
    console.log('✅ AI learning loaded for', fileType, ':', Object.keys(learningData).length, 'items');
    return learningData;
  } catch (error) {
    console.error('Error getting AI learning:', error);
    return {};
  }
}

export async function updateAILearningUsage(fileType: string, accountName: string) {
  if (!supabase) {
    console.log('Supabase not available, cannot update AI learning usage');
    return null;
  }
  
  try {
    // First, get the current usage count
    const { data: currentData, error: fetchError } = await supabase
      .from('ai_learning')
      .select('usage_count')
      .eq('file_type', fileType)
      .eq('account_name', accountName)
      .single();
    
    if (fetchError) {
      console.error('Error fetching current usage count:', fetchError);
      return null;
    }
    
    // Then update with the incremented value
    const { error } = await supabase
      .from('ai_learning')
      .update({ 
        usage_count: (currentData?.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('file_type', fileType)
      .eq('account_name', accountName);
    
    if (error) {
      console.error('Error updating AI learning usage:', error);
      return null;
    }
    
    console.log('✅ AI learning usage updated');
    return true;
  } catch (error) {
    console.error('Error updating AI learning usage:', error);
    return null;
  }
}
