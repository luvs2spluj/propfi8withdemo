// Migration to create required collections
migrate((db) => {
  // Create csv_data collection
  const csvDataCollection = new Collection({
    "id": "csv_data",
    "name": "csv_data",
    "type": "base",
    "system": false,
    "schema": [
      {
        "id": "file_name",
        "name": "file_name",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "id": "file_type",
        "name": "file_type",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "pattern": ""
        }
      },
      {
        "id": "total_records",
        "name": "total_records",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": null,
          "max": null,
          "noDecimal": false
        }
      },
      {
        "id": "account_categories",
        "name": "account_categories",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "bucket_assignments",
        "name": "bucket_assignments",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "tags",
        "name": "tags",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "is_active",
        "name": "is_active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "preview_data",
        "name": "preview_data",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "time_series",
        "name": "time_series",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {}
      },
      {
        "id": "data_date",
        "name": "data_date",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "options": {
          "min": "",
          "max": ""
        }
      }
    ],
    "indexes": [],
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "options": {}
  });

  return $app.dao().saveCollection(csvDataCollection);
}, (db) => {
  // Rollback
  const collection = $app.dao().findCollectionByNameOrId("csv_data");
  return $app.dao().deleteCollection(collection);
});