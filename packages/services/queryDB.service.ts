import type { Client } from '@notionhq/client';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

export class NotionSchema {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    db(id: string) {
        return {
            properties: (
                props: Record<string, PropertySchema>
            ): DatabaseSchema => ({
                id,
                properties: props,
            }),
        };
    }

    property_type(type: PropertyType) {
        return {
            key: (isKey: boolean = false): PropertySchema => ({
                type,
                key: isKey,
            }),
            include: (...fields: UserField[]): UserPropertySchema => ({
                type: type as 'created_by' | 'last_edited_by',
                include: fields,
            }),
            fetchRelated: (fetch: boolean = true): RelationPropertySchema => ({
                type: 'relation',
                fetchRelated: fetch,
            }),
        };
    }

    private async fetchRelatedPages(
        pageIds: string[]
    ): Promise<Record<string, any>> {
        const relatedPages: Record<string, any> = {};
        for (const id of pageIds) {
            try {
                const page: any = await this.client.pages.retrieve({
                    page_id: id,
                });
                const titleKey = Object.keys(page.properties).find(
                    (key) => page.properties[key].type === 'title'
                );
                if (titleKey) {
                    relatedPages[id] =
                        page.properties[titleKey].title[0]?.plain_text || null;
                } else {
                    relatedPages[id] = null;
                }
            } catch (error) {
                console.error(`Error fetching related page ${id}:`, error);
                relatedPages[id] = null;
            }
        }
        return relatedPages;
    }

    async getAllTopLevelPages() {
        let results: PageObjectResponse[] = [];
        let cursor: string | undefined = undefined;

        do {
            const response = await this.client.search({
                start_cursor: cursor,
                filter: {
                    property: 'object',
                    value: 'page',
                },
            });

            const topLevelPages = response.results.filter((page: any) => {
                const parent = page.parent;
                return (
                    parent.type === 'workspace' ||
                    (parent.type === 'page_id' && !parent.page_id)
                );
            }) as PageObjectResponse[];

            results = results.concat(topLevelPages);
            cursor = response.next_cursor || undefined;
        } while (cursor);

        return results.map((result: any) => ({
            page_id: result.id,
            page_name: result.properties.title.title[0].plain_text,
            page_parent: result.parent,
        }));
    }

    async getInlineDatabasesFromPage(
        pageId: string
    ): Promise<Array<{ databaseId: string; databaseName: string }>> {
        const inlineDatabases: Array<{
            databaseId: string;
            databaseName: string;
        }> = [];
        let cursor: string | undefined = undefined;

        do {
            const response = await this.client.blocks.children.list({
                block_id: pageId,
                start_cursor: cursor,
            });

            const databases = response.results.filter(
                (block: any) => block.type === 'child_database'
            );

            // Store each database's info
            databases.forEach((db: any) => {
                inlineDatabases.push({
                    databaseId: db.id,
                    databaseName: db.child_database.title,
                });
            });

            // Update cursor for pagination
            cursor = response.next_cursor || undefined;
        } while (cursor);

        return inlineDatabases;
    }

    async getAllConnectedPages(): Promise<PageObjectResponse[]> {
        let results: PageObjectResponse[] = [];
        let cursor: string | undefined = undefined;

        do {
            const response = await this.client.search({
                start_cursor: cursor,
                filter: {
                    property: 'object',
                    value: 'page',
                },
            });

            results = results.concat(response.results as PageObjectResponse[]);
            cursor = response.next_cursor || undefined;
        } while (cursor);

        return results;
    }

    async queryDatabase(schema: DatabaseSchema, query?: any) {
        try {
            const response = await this.client.databases.query({
                database_id: schema.id,
                ...query,
            });

            const relatedPageIds: string[] = [];

            const transformedResults = response.results.map((page: any) => {
                const result: Record<string, any> = { pageId: page.id };
                for (const [key, prop] of Object.entries(schema.properties)) {
                    const pageProperty = page.properties[key];
                    if (pageProperty) {
                        switch (prop.type) {
                            case 'title':
                            case 'rich_text':
                                result[key] =
                                    pageProperty[prop.type][0]?.plain_text ||
                                    null;
                                break;
                            case 'number':
                                result[key] = pageProperty.number;
                                break;
                            case 'select':
                                result[key] = pageProperty.select?.name || null;
                                break;
                            case 'multi_select':
                                result[key] = pageProperty.multi_select.map(
                                    (item: any) => item.name
                                );
                                break;
                            case 'date':
                                result[key] = pageProperty.date?.start || null;
                                break;
                            case 'checkbox':
                                result[key] = pageProperty.checkbox;
                                break;
                            case 'relation':
                                const relationIds = pageProperty.relation.map(
                                    (item: any) => item.id
                                );
                                result[key] = relationIds;
                                if (
                                    (prop as RelationPropertySchema)
                                        .fetchRelated
                                ) {
                                    relatedPageIds.push(...relationIds);
                                }
                                break;
                            case 'created_by':
                            case 'last_edited_by':
                                if (
                                    'include' in prop &&
                                    prop.include &&
                                    prop.include.length > 0
                                ) {
                                    result[key] = {};
                                    for (const field of prop.include) {
                                        if (field === 'email') {
                                            result[key].email =
                                                pageProperty[prop.type].person
                                                    ?.email || null;
                                        } else {
                                            result[key][field] =
                                                pageProperty[prop.type][
                                                    field
                                                ] || null;
                                        }
                                    }
                                } else {
                                    result[key] = pageProperty[prop.type].id;
                                }
                                break;
                            default:
                                result[key] = pageProperty[prop.type] || null;
                        }
                    } else {
                        result[key] = null;
                    }
                }
                return result;
            });

            if (relatedPageIds.length > 0) {
                const relatedPages = await this.fetchRelatedPages([
                    ...new Set(relatedPageIds),
                ]);
                transformedResults.forEach((result) => {
                    for (const [key, prop] of Object.entries(
                        schema.properties
                    )) {
                        if (
                            prop.type === 'relation' &&
                            (prop as RelationPropertySchema).fetchRelated
                        ) {
                            result[key] = result[key].map((id: string) => ({
                                id,
                                title: relatedPages[id],
                            }));
                        }
                    }
                });
            }

            return transformedResults;
        } catch (error) {
            console.error('Error querying database:', error);
            throw error;
        }
    }
}