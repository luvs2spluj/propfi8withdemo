const { pool } = require('../config/database');

class PropertyService {
  // Get all properties
  async getAllProperties() {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM properties ORDER BY name ASC'
      );
      return rows;
    } catch (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }
  }

  // Get property by ID
  async getPropertyById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM properties WHERE id = ?',
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch property: ${error.message}`);
    }
  }

  // Get property by name
  async getPropertyByName(name) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM properties WHERE name = ?',
        [name]
      );
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch property by name: ${error.message}`);
    }
  }

  // Create new property
  async createProperty(propertyData) {
    try {
      const { name, address, type, totalUnits } = propertyData;
      const [result] = await pool.execute(
        'INSERT INTO properties (name, address, type, total_units) VALUES (?, ?, ?, ?)',
        [name, address, type, totalUnits]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Property with this name already exists');
      }
      throw new Error(`Failed to create property: ${error.message}`);
    }
  }

  // Update property
  async updateProperty(id, propertyData) {
    try {
      const { name, address, type, totalUnits } = propertyData;
      const [result] = await pool.execute(
        'UPDATE properties SET name = ?, address = ?, type = ?, total_units = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, address, type, totalUnits, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }
  }

  // Delete property
  async deleteProperty(id) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM properties WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Failed to delete property: ${error.message}`);
    }
  }

  // Get property data with pagination
  async getPropertyData(propertyId, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const [rows] = await pool.execute(
        `SELECT pd.*, p.name as property_name 
         FROM property_data pd 
         JOIN properties p ON pd.property_id = p.id 
         WHERE pd.property_id = ? 
         ORDER BY pd.data_date DESC 
         LIMIT ? OFFSET ?`,
        [propertyId, limit, offset]
      );
      return rows;
    } catch (error) {
      throw new Error(`Failed to fetch property data: ${error.message}`);
    }
  }

  // Get aggregated property data
  async getAggregatedPropertyData(propertyId, startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          COUNT(*) as total_records,
          AVG(monthly_revenue) as avg_monthly_revenue,
          AVG(occupancy_rate) as avg_occupancy_rate,
          AVG(occupied_units) as avg_occupied_units,
          SUM(monthly_revenue) as total_revenue,
          SUM(expenses) as total_expenses,
          SUM(net_income) as total_net_income,
          MIN(data_date) as earliest_date,
          MAX(data_date) as latest_date
        FROM property_data 
        WHERE property_id = ?
      `;
      
      const params = [propertyId];
      
      if (startDate) {
        query += ' AND data_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND data_date <= ?';
        params.push(endDate);
      }

      const [rows] = await pool.execute(query, params);
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch aggregated data: ${error.message}`);
    }
  }

  // Get all properties with their latest data
  async getPropertiesWithLatestData() {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          p.*,
          pd.monthly_revenue,
          pd.occupancy_rate,
          pd.occupied_units,
          pd.expenses,
          pd.net_income,
          pd.data_date as latest_data_date
        FROM properties p
        LEFT JOIN (
          SELECT 
            property_id,
            monthly_revenue,
            occupancy_rate,
            occupied_units,
            expenses,
            net_income,
            data_date,
            ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY data_date DESC) as rn
          FROM property_data
        ) pd ON p.id = pd.property_id AND pd.rn = 1
        ORDER BY p.name ASC
      `);
      return rows;
    } catch (error) {
      throw new Error(`Failed to fetch properties with latest data: ${error.message}`);
    }
  }

  // Get financial summary for all properties
  async getFinancialSummary(startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          COUNT(DISTINCT property_id) as total_properties,
          COUNT(*) as total_records,
          SUM(monthly_revenue) as total_revenue,
          SUM(expenses) as total_expenses,
          SUM(net_income) as total_net_income,
          AVG(occupancy_rate) as avg_occupancy_rate,
          SUM(occupied_units) as total_occupied_units,
          SUM(p.total_units) as total_units
        FROM property_data pd
        JOIN properties p ON pd.property_id = p.id
      `;
      
      const params = [];
      
      if (startDate || endDate) {
        query += ' WHERE ';
        const conditions = [];
        
        if (startDate) {
          conditions.push('pd.data_date >= ?');
          params.push(startDate);
        }
        
        if (endDate) {
          conditions.push('pd.data_date <= ?');
          params.push(endDate);
        }
        
        query += conditions.join(' AND ');
      }

      const [rows] = await pool.execute(query, params);
      return rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch financial summary: ${error.message}`);
    }
  }
}

module.exports = PropertyService;
