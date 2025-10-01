import PocketBase from 'pocketbase';

// Initialize PocketBase client
const pb = new PocketBase('http://127.0.0.1:8090');

// Enable auto-cancellation of pending requests
pb.autoCancellation(false);

export { pb };

// Auth functions
export async function authenticateUser(email: string, password: string) {
  try {
    const authData = await pb.collection('users').authWithPassword(email, password);
    return authData;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

export async function registerUser(email: string, password: string, firstName?: string, lastName?: string) {
  try {
    const data = {
      email,
      password,
      passwordConfirm: password,
      first_name: firstName,
      last_name: lastName,
    };
    const record = await pb.collection('users').create(data);
    return record;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export function getCurrentUser() {
  return pb.authStore.model;
}

export function logout() {
  pb.authStore.clear();
}

// CSV Data functions
export async function getCSVData(userId?: string) {
  try {
    const filter = userId ? `owner = "${userId}"` : '';
    const records = await pb.collection('csv_data').getFullList({
      filter,
      sort: '-created',
    });
    return records;
  } catch (error) {
    console.error('Error fetching CSV data:', error);
    return [];
  }
}

export async function saveCSVData(csvData: any, userId?: string) {
  try {
    const data = {
      ...csvData,
      owner: userId || pb.authStore.model?.id,
    };
    const record = await pb.collection('csv_data').create(data);
    return record;
  } catch (error) {
    console.error('Error saving CSV data:', error);
    throw error;
  }
}

export async function updateCSVData(id: string, csvData: any) {
  try {
    const record = await pb.collection('csv_data').update(id, csvData);
    return record;
  } catch (error) {
    console.error('Error updating CSV data:', error);
    throw error;
  }
}

export async function deleteCSVData(id: string) {
  try {
    await pb.collection('csv_data').delete(id);
    return true;
  } catch (error) {
    console.error('Error deleting CSV data:', error);
    throw error;
  }
}

// Properties functions
export async function getProperties(userId?: string) {
  try {
    const filter = userId ? `owner = "${userId}"` : '';
    const records = await pb.collection('properties').getFullList({
      filter,
      sort: '-created',
    });
    return records;
  } catch (error) {
    console.error('Error fetching properties:', error);
    return [];
  }
}

export async function saveProperty(propertyData: any, userId?: string) {
  try {
    const data = {
      ...propertyData,
      owner: userId || pb.authStore.model?.id,
    };
    const record = await pb.collection('properties').create(data);
    return record;
  } catch (error) {
    console.error('Error saving property:', error);
    throw error;
  }
}

export async function updateProperty(id: string, propertyData: any) {
  try {
    const record = await pb.collection('properties').update(id, propertyData);
    return record;
  } catch (error) {
    console.error('Error updating property:', error);
    throw error;
  }
}

export async function deleteProperty(id: string) {
  try {
    await pb.collection('properties').delete(id);
    return true;
  } catch (error) {
    console.error('Error deleting property:', error);
    throw error;
  }
}

// Property Data functions
export async function getPropertyData(propertyId: string) {
  try {
    const records = await pb.collection('property_data').getFullList({
      filter: `property = "${propertyId}"`,
      sort: 'date',
    });
    return records;
  } catch (error) {
    console.error('Error fetching property data:', error);
    return [];
  }
}

export async function savePropertyData(propertyData: any) {
  try {
    const record = await pb.collection('property_data').create(propertyData);
    return record;
  } catch (error) {
    console.error('Error saving property data:', error);
    throw error;
  }
}

// AI Learning functions (for CSV categorization)
export async function saveAILearning(learningData: any, userId?: string) {
  try {
    const data = {
      ...learningData,
      owner: userId || pb.authStore.model?.id,
    };
    const record = await pb.collection('ai_learning').create(data);
    return record;
  } catch (error) {
    console.error('Error saving AI learning:', error);
    throw error;
  }
}

export async function getAILearning(userId?: string) {
  try {
    const filter = userId ? `owner = "${userId}"` : '';
    const records = await pb.collection('ai_learning').getFullList({
      filter,
      sort: '-created',
    });
    return records;
  } catch (error) {
    console.error('Error fetching AI learning:', error);
    return [];
  }
}

export async function updateAILearningUsage(id: string, usageData: any) {
  try {
    const record = await pb.collection('ai_learning').update(id, usageData);
    return record;
  } catch (error) {
    console.error('Error updating AI learning usage:', error);
    throw error;
  }
}

// Migration function to move data from localStorage to PocketBase
export async function migrateLocalStorageToPocketBase(userId?: string) {
  try {
    const savedCSVs = localStorage.getItem('savedCSVs');
    if (!savedCSVs) {
      return { success: true, migrated: 0, errors: 0, total: 0 };
    }

    const csvList = JSON.parse(savedCSVs);
    let migratedCount = 0;
    let errorCount = 0;

    for (const csv of csvList) {
      try {
        await saveCSVData(csv, userId);
        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate CSV ${csv.file_name}:`, error);
        errorCount++;
      }
    }

    // Clear localStorage after successful migration
    if (migratedCount > 0) {
      localStorage.removeItem('savedCSVs');
    }

    return {
      success: true,
      migrated: migratedCount,
      errors: errorCount,
      total: csvList.length
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Real-time subscriptions
export function subscribeToCSVData(callback: (data: any) => void) {
  return pb.collection('csv_data').subscribe('*', callback);
}

export function subscribeToProperties(callback: (data: any) => void) {
  return pb.collection('properties').subscribe('*', callback);
}

// File upload helper
export async function uploadFile(file: File, recordId: string, fieldName: string) {
  try {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    const record = await pb.collection('csv_data').update(recordId, formData);
    return record;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}
