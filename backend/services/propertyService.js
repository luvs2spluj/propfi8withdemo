const { pool } = require('../config/supabase');

class PropertyService {
  // Get all properties
  async getAllProperties() {
    try {
      const result = await pool.query(
        'SELECT * FROM properties ORDER BY name ASC'
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }
  }

  // Get property by ID
  async getPropertyById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM properties WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch property: ${error.message}`);
    }
  }

  // Get property by name
  async getPropertyByName(name) {
    try {
      const result = await pool.query(
        'SELECT * FROM properties WHERE name = $1',
        [name]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch property by name: ${error.message}`);
    }
  }

  // Create new property
  async createProperty(propertyData) {
    try {
      const { name, address, type, totalUnits } = propertyData;
      const result = await pool.query(
        'INSERT INTO properties (name, address, type, total_units) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, address, type, totalUnits]
      );
      return result.rows[0].id;
    } catch (error) {
      throw new Error(`Failed to create property: ${error.message}`);
    }
  }

  // Update property
  async updateProperty(id, propertyData) {
    try {
      const { name, address, type, totalUnits } = propertyData;
      const result = await pool.query(
        'UPDATE properties SET name = $1, address = $2, type = $3, total_units = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [name, address, type, totalUnits, id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }
  }

  // Delete property
  async deleteProperty(id) {
    try {
      const result = await pool.query(
        'DELETE FROM properties WHERE id = $1',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete property: ${error.message}`);
    }
  }

  // Get property data with pagination
  async getPropertyData(propertyId, page = 1, limit = 50) {
    try {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const result = await pool.query(
        `SELECT pd.*, p.name as property_name 
         FROM property_data pd 
         JOIN properties p ON pd.property_id = p.id 
         WHERE pd.property_id = $1 
         ORDER BY pd.date DESC 
         LIMIT $2 OFFSET $3`,
        [propertyId, parseInt(limit), offset]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch property data: ${error.message}`);
    }
  }

  // Get aggregated property data
  async getAggregatedPropertyData(propertyId, startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          p.name as property_name,
          COUNT(pd.id) as total_records,
          AVG(pd.revenue) as avg_revenue,
          AVG(pd.occupancy_rate) as avg_occupancy,
          SUM(pd.revenue) as total_revenue,
          SUM(pd.maintenance_cost + pd.utilities_cost + pd.insurance_cost + pd.property_tax + pd.other_expenses) as total_expenses,
          SUM(pd.revenue - (pd.maintenance_cost + pd.utilities_cost + pd.insurance_cost + pd.property_tax + pd.other_expenses)) as total_net_income
        FROM properties p
        LEFT JOIN property_data pd ON p.id = pd.property_id
        WHERE p.id = $1
      `;
      
      const params = [propertyId];
      let paramIndex = 2;
      
      if (startDate) {
        query += ` AND pd.date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        query += ` AND pd.date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }
      
      query += ' GROUP BY p.id, p.name';
      
      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch aggregated property data: ${error.message}`);
    }
  }

  // Get properties with data
  async getPropertiesWithData() {
    try {
      const result = await pool.query(`
        SELECT 
          p.*,
          COUNT(pd.id) as data_count,
          MAX(pd.date) as latest_data_date,
          AVG(pd.revenue) as avg_revenue,
          AVG(pd.occupancy_rate) as avg_occupancy
        FROM properties p
        LEFT JOIN property_data pd ON p.id = pd.property_id
        GROUP BY p.id, p.name, p.address, p.type, p.total_units, p.created_at, p.updated_at
        ORDER BY p.name ASC
      `);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch properties with data: ${error.message}`);
    }
  }

  // Get financial summary
  async getFinancialSummary(startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          COUNT(DISTINCT p.id) as total_properties,
          COUNT(pd.id) as total_records,
          SUM(pd.revenue) as total_revenue,
          SUM(pd.maintenance_cost + pd.utilities_cost + pd.insurance_cost + pd.property_tax + pd.other_expenses) as total_expenses,
          SUM(pd.revenue - (pd.maintenance_cost + pd.utilities_cost + pd.insurance_cost + pd.property_tax + pd.other_expenses)) as total_net_income,
          AVG(pd.occupancy_rate) as avg_occupancy_rate
        FROM properties p
        LEFT JOIN property_data pd ON p.id = pd.property_id
      `;
      
      const params = [];
      let paramIndex = 1;
      
      if (startDate || endDate) {
        query += ' WHERE ';
        const conditions = [];
        
        if (startDate) {
          conditions.push(`pd.date >= $${paramIndex}`);
          params.push(startDate);
          paramIndex++;
        }
        
        if (endDate) {
          conditions.push(`pd.date <= $${paramIndex}`);
          params.push(endDate);
          paramIndex++;
        }
        
        query += conditions.join(' AND ');
      }
      
      const result = await pool.query(query, params);
      return result.rows[0] || {
        total_properties: 0,
        total_records: 0,
        total_revenue: 0,
        total_expenses: 0,
        total_net_income: 0,
        avg_occupancy_rate: 0
      };
    } catch (error) {
      throw new Error(`Failed to fetch financial summary: ${error.message}`);
    }
  }
}

module.exports = new PropertyService();
