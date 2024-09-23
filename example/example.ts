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

async function main() {
    try {
        // Retrieving all top-level pages connected to the integration.
        const pages = await notionSchema.getAllTopLevelPages();
        const inlineDBLists: inlineDB[] = [];

        // Fetching all available inline databases within the retrieved pages.
        for (const page of pages) {
            const dbLists = await notionSchema.getInlineDatabasesFromPage(
                page.page_id
            );
            inlineDBLists.push(...dbLists);
        }

        // Filtering the ID of the desired database.
        const databaseID = inlineDBLists.filter(
            (db) => db.databaseName == 'GuidePost'
        )[0].databaseId;

        // Retrieving data from database.
        const data = await notionSchema.queryDatabase(
            guidePostTable(databaseID)
        );

        console.log('Fetched data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
