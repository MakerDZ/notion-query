type PropertyType =
    | 'title'
    | 'rich_text'
    | 'number'
    | 'select'
    | 'multi_select'
    | 'date'
    | 'people'
    | 'files'
    | 'checkbox'
    | 'url'
    | 'email'
    | 'phone_number'
    | 'formula'
    | 'relation'
    | 'rollup'
    | 'created_time'
    | 'created_by'
    | 'last_edited_time'
    | 'last_edited_by';

type UserField = 'id' | 'name' | 'avatar_url' | 'email';

interface BasePropertySchema {
    type: PropertyType;
    key?: boolean;
}

interface UserPropertySchema extends BasePropertySchema {
    type: 'created_by' | 'last_edited_by';
    include?: UserField[];
}

interface RelationPropertySchema extends BasePropertySchema {
    type: 'relation';
    fetchRelated?: boolean;
}

type PropertySchema = BasePropertySchema | UserPropertySchema;

interface DatabaseSchema {
    id: string;
    properties: Record<string, PropertySchema>;
}


interface inlineDB {
    databaseId: string;
    databaseName: string;
}