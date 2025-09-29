import { createClient } from "@supabase/supabase-js";
import { encryptionService } from '../services/encryptionService';
import { auditService } from '../services/auditService';

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

export async function saveCSVData(csvData: any, userId?: string) {
  if (!supabase) {
    console.log('Supabase not available, saving to localStorage only');
    return null;
  }
  
  try {
    // Encrypt sensitive data before saving
    const encryptedData = encryptionService.encryptCSVData(csvData);
    
    // Add user_id to the CSV data if provided
    const dataToSave = userId ? { ...encryptedData, user_id: userId } : encryptedData;
    
    const { data, error } = await supabase
      .from('csv_data')
      .insert([dataToSave])
      .select();
    
    if (error) {
      console.error('Error saving CSV data to Supabase:', error);
      return null;
    }
    
    // Log the data modification
    auditService.logDataModification('CSV_DATA', data[0]?.id, {
      fileName: csvData.file_name,
      fileType: csvData.file_type,
      recordCount: csvData.total_records
    });
    
    console.log('CSV data saved to Supabase (encrypted)');
    return data[0];
  } catch (error) {
    console.error('Error saving CSV data:', error);
    return null;
  }
}

export async function getCSVData(userId?: string) {
  if (!supabase) {
    console.log('Supabase not available, reading from localStorage only');
    return [];
  }
  
  try {
    let query = supabase
      .from('csv_data')
      .select('*')
      .order('uploaded_at', { ascending: false });
    
    // Filter by user_id if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching CSV data from Supabase:', error);
      return [];
    }
    
    // Decrypt sensitive data after retrieval
    const decryptedData = (data || []).map(item => 
      encryptionService.decryptCSVData(item)
    );
    
    // Log the data access
    auditService.logDataAccess('CSV_DATA', undefined, {
      recordCount: decryptedData.length,
      userId: userId
    });
    
    console.log('CSV data fetched from Supabase (decrypted)');
    return decryptedData;
  } catch (error) {
    console.error('Error fetching CSV data:', error);
    return [];
  }
}

export async function deleteCSVData(csvId: string, userId?: string) {
  if (!supabase) {
    console.log('Supabase not available, deleting from localStorage only');
    return null;
  }
  
  try {
    let query = supabase
      .from('csv_data')
      .delete()
      .eq('id', csvId);
    
    // Add user_id filter if provided to ensure user can only delete their own data
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('Error deleting CSV data from Supabase:', error);
      return null;
    }
    
    // Log the data deletion
    auditService.logDataDeletion('CSV_DATA', csvId, {
      userId: userId
    });
    
    console.log('CSV data deleted from Supabase:', csvId);
    return true;
  } catch (error) {
    console.error('Error deleting CSV data:', error);
    return null;
  }
}

// AI Learning Functions
export async function saveAILearning(fileType: string, accountName: string, userCategory: string, userId?: string) {
  if (!supabase) {
    console.log('Supabase not available, cannot save AI learning');
    return null;
  }
  
  try {
    const learningData = {
      file_type: fileType,
      account_name: accountName,
      user_category: userCategory,
      confidence_score: 1.0,
      usage_count: 1,
      updated_at: new Date().toISOString(),
      ...(userId && { user_id: userId })
    };
    
    const { error } = await supabase
      .from('ai_learning')
      .upsert(learningData, {
        onConflict: userId ? 'file_type,account_name,user_id' : 'file_type,account_name'
      });
    
    if (error) {
      console.error('Error saving AI learning:', error);
      return null;
    }
    
    console.log('✅ AI learning saved:', { fileType, accountName, userCategory, userId });
    return true;
  } catch (error) {
    console.error('Error saving AI learning:', error);
    return null;
  }
}

export async function getAILearning(fileType: string, userId?: string) {
  if (!supabase) {
    console.log('Supabase not available, cannot get AI learning');
    return {};
  }
  
  try {
    let query = supabase
      .from('ai_learning')
      .select('account_name, user_category, confidence_score, usage_count')
      .eq('file_type', fileType);
    
    // Filter by user_id if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
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

export async function updateAILearningUsage(fileType: string, accountName: string, userId?: string) {
  if (!supabase) {
    console.log('Supabase not available, cannot update AI learning usage');
    return null;
  }
  
  try {
    // First, get the current usage count
    let query = supabase
      .from('ai_learning')
      .select('usage_count')
      .eq('file_type', fileType)
      .eq('account_name', accountName);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: currentData, error: fetchError } = await query.single();
    
    if (fetchError) {
      console.error('Error fetching current usage count:', fetchError);
      return null;
    }
    
    // Then update with the incremented value
    let updateQuery = supabase
      .from('ai_learning')
      .update({ 
        usage_count: (currentData?.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('file_type', fileType)
      .eq('account_name', accountName);
    
    if (userId) {
      updateQuery = updateQuery.eq('user_id', userId);
    }
    
    const { error } = await updateQuery;
    
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
