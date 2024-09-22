# notion-query

`notion-query` is a lightweight package designed to simplify the process of dynamically querying data from Notion's inline databases. It provides an abstraction layer over the official `@notionhq/client`, making it easier to interact with various inline databases, regardless of their unique structures.

## Features

- **Dynamic Queries**: Handle different inline database structures without hardcoding.
- **Schema Abstraction**: Define and manage database schemas easily.
- **Top-Level Page Management**: Retrieve all top-level pages connected to your Notion integration.
- **Built on Official Client**: Utilizes `@notionhq/client` for reliable Notion API interactions.

## Installation

Install via npm or yarn or pnpm or bun:

```bash
bun i notion-query @notionhq/client
```

## Quick Start 

### Setup 

Initialize the official Notion client:


```typescript
import { Client } from '@notionhq/client';

// Initialize Notion client with your integration token
export const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});
```

### Define Schema 

Create a schema for your target inline database:


```typescript
import { notion, NotionSchema } from 'notion-query';

const notionSchema = new NotionSchema(notion);

const guidePostTable = (databaseId: string) => {
    return notionSchema.db(databaseId).properties({
        Name: notionSchema.property_type('title').key(true),
        Country: notionSchema.property_type('relation').fetchRelated(true),
        Tags: notionSchema.property_type('multi_select').key(),

        CreatedBy: notionSchema
            .property_type('created_by')
            .include('name', 'email'),
        UpdatedBy: notionSchema
            .property_type('last_edited_by')
            .include('name', 'email'),
        CreatedAt: notionSchema.property_type('created_time').key(),
        UpdatedAt: notionSchema.property_type('last_edited_time').key(),
    });
};
```

### Fetch Data 

Retrieve and query data from Notion:


```typescript
async function main() {
    try {
        // Get all top-level pages
        const pages = await notionSchema.getAllTopLevelPages();
        const inlineDBLists: inlineDB[] = [];

        // Fetch inline databases from each page
        for (const page of pages) {
            const dbLists = await notionSchema.getInlineDatabasesFromPage(page.page_id);
            inlineDBLists.push(...dbLists);
        }

        // Find the 'GuidePost' database ID
        const databaseID = inlineDBLists.find(db => db.databaseName === 'GuidePost')?.databaseId;

        if (!databaseID) {
            throw new Error("GuidePost database not found.");
        }

        // Query the database
        const data = await notionSchema.queryDatabase(guidePostTable(databaseID));
        console.log('Fetched data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
```

## Example 

Here's a complete example combining setup, schema definition, and data fetching:


```typescript
import { Client } from '@notionhq/client';
import { notion, NotionSchema } from 'notion-query';

// Initialize Notion client
export const notionClient = new Client({
    auth: process.env.NOTION_TOKEN,
});

// Initialize NotionSchema
const notionSchema = new NotionSchema(notionClient);

// Define the schema for the 'GuidePost' database
const guidePostTable = (databaseId: string) => {
    return notionSchema.db(databaseId).properties({
        Name: notionSchema.property_type('title').key(true),
        Country: notionSchema.property_type('relation').fetchRelated(true),
        Tags: notionSchema.property_type('multi_select').key(),

        CreatedBy: notionSchema
            .property_type('created_by')
            .include('name', 'email'),
        UpdatedBy: notionSchema
            .property_type('last_edited_by')
            .include('name', 'email'),
        CreatedAt: notionSchema.property_type('created_time').key(),
        UpdatedAt: notionSchema.property_type('last_edited_time').key(),
    });
};

// Main function to fetch and display data
async function main() {
    try {
        const pages = await notionSchema.getAllTopLevelPages();
        const inlineDBLists: inlineDB[] = [];

        for (const page of pages) {
            const dbLists = await notionSchema.getInlineDatabasesFromPage(page.page_id);
            inlineDBLists.push(...dbLists);
        }

        const databaseID = inlineDBLists.find(db => db.databaseName === 'GuidePost')?.databaseId;

        if (!databaseID) {
            throw new Error("GuidePost database not found.");
        }

        const data = await notionSchema.queryDatabase(guidePostTable(databaseID));
        console.log('Fetched data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
```

## Usage Notes 

- Ensure your Notion integration has access to the necessary pages and databases.

- Customize the schema definitions based on your database properties.

## Contributing 

Feel free to open issues or submit pull requests for improvements and new features.

## License 
MIT © [zed](https://github.com/makerdz) 